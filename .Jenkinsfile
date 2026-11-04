pipeline {
    agent any

    tools {
        nodejs 'node20'
    }

    environment {
        SONARQUBE_ENV = 'sonar'
        SONAR_TOKEN   = credentials('sonar-token')
    }

    stages {

        // ----------------------
        // CI: Clone, Test, Sonar
        // ----------------------
        stage('Clone') {
            steps {
                git url: 'https://github.com/widchayapon/nginx-node-test.git', branch: 'main'
            }
        }

        // stage('Install Dependencies') {
        //     steps {
        //         sh 'npm install'
        //     }
        // }
        stage('Install Dependencies') {
            steps {
                cache(caches: [
                    arbitraryFileCache(
                        cacheName: 'npm-node-modules',                // 👈 ชื่อ cache ที่ Jenkins ใช้เก็บ/โหลด
                        path: 'node_modules',                         // 👈 โฟลเดอร์ที่จะเก็บเป็น cache
                        includes: '**/*',                             // 👈 ไฟล์ที่ต้องการรวมใน cache (ทั้งหมด)
                        cacheValidityDecidingFile: 'package-lock.json', // 👈 ไฟล์ที่ Jenkins จะเช็กว่า cache ยังใช้ได้ไหม
                        useDefaultExcludes: true,                     // 👈 ข้ามไฟล์ระบบ/ซ่อน (เช่น .git)
                        compressionMethod: 'TARGZ'                    // 👈 วิธีบีบอัด cache (TAR+GZ เร็วและเบา)
                    )
                ]) {
                    sh 'npm ci' // 👈 ใช้ ci เพราะ cache ทำให้การติดตั้งเร็วขึ้นมาก
                }
            }
        }

        stage('Test with Coverage') {
            steps {
                sh 'npm test -- --coverage'
            }
        }

        // stage('Run Tests in Parallel') {
        //     parallel {
        //         stage('Unit Test') {
        //             steps {
        //                 sh 'npm run test:unit'
        //             }
        //         }

        //         stage('Integration Test') {
        //             steps {
        //                 sh 'npm run test:integration'
        //             }
        //         }

        //         stage('Lint') {
        //             steps {
        //                 sh 'npm run lint'
        //             }
        //         }
        //     }
        // }        

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv("${SONARQUBE_ENV}") {
                    withEnv(["PATH+SONAR=${tool 'sonar-scanner'}/bin"]) {
                        sh '''
                            sonar-scanner \
                            -Dsonar.projectKey=nginx-node-test \
                            -Dsonar.sources=. \
                            -Dsonar.host.url=http://sonarqube:9000 \
                            -Dsonar.token=$SONAR_TOKEN \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.qualitygate.wait=true
                        '''
                    }
                }
            }
        }

        // stage('Prepare for Trivy') {
        //     steps {
        //         sh '''
        //             rm -rf /var/jenkins_home/trivy-scan
        //             mkdir -p /var/jenkins_home/trivy-scan
        //             cp -r $WORKSPACE/* /var/jenkins_home/trivy-scan/
        //         '''
        //     }
        // }

        stage('Create Home Workspace') {
            steps {
                script {
                    env.HOME_WORKSPACE = sh(
                    script: 'echo "$WORKSPACE" | sed "s|/var/jenkins_home|${HOST_HOME}/jenkins_data|"',
                    returnStdout: true
                    ).trim()

                    echo "✅ HOME_WORKSPACE = ${env.HOME_WORKSPACE}"
                }
            }
        }

        stage('🔎 Debug Trivy Config Path') {
            steps {
                sh '''
                    echo "🔍 Home WORKSPACE = ${HOME_WORKSPACE}"
                    docker run --rm -v ${HOME_WORKSPACE}:/project alpine ls -al /project
                    docker run --rm -v ${HOME_WORKSPACE}:/project ubuntu bash -c "ls -al /project"
                '''
            }
        }

        stage('Pre-pull Trivy') {
            steps {
                sh 'docker pull aquasec/trivy:latest'
            }
        }

        stage('Security Scans Secret & Config') {
            parallel {
                stage('Trivy Secrets Scan') {
                    steps {
                        sh '''
                            docker run --rm \
                            -v ${HOME_WORKSPACE}:/project \
                            -v ${HOME_WORKSPACE}/output:/output \
                            aquasec/trivy:latest fs /project \
                            --scanners secret \
                            --exit-code 0 \
                            --severity LOW,MEDIUM,HIGH,CRITICAL \
                            --output /output/trivy-secret-scan.txt
                        '''
                    }
                }

                stage('Trivy Config Scan') {
                    steps {
                        sh '''
                            docker run --rm \
                            -v ${HOME_WORKSPACE}:/project \
                            -v ${HOME_WORKSPACE}/output:/output \
                            aquasec/trivy:latest fs /project \
                            --scanners misconfig \
                            --exit-code 0 \
                            --severity LOW,MEDIUM,HIGH,CRITICAL \
                            --output /output/trivy-config-scan.txt
                        '''
                    }
                }
            }
        }


        // ----------------------
        // Build image (local only)
        // ----------------------
        stage('Build Docker Image') {
            steps {
                // sh 'docker build -t nginx-node-test:latest .'
                sh '''
                    docker build \
                    --cache-from=nginx-node-test:latest \
                    -t nginx-node-test:latest .
                '''
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-cred', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
                        docker tag nginx-node-test:latest tar3kom/nginx-node-test:latest
                        docker push tar3kom/nginx-node-test:latest
                        docker logout
                    '''
                }
            }
        }
        // stage('Trivy Scan') {
        //     steps {
        //         sh '''
        //         docker exec trivy trivy image tar3kom/nginx-node-test:latest || true
        //         '''
        //     }
        // }
        // stage('Trivy Scan') {
        //     steps {
        //         sh '''
        //         docker exec trivy trivy image \
        //         --exit-code 1 \
        //         --severity HIGH,CRITICAL \
        //         tar3kom/nginx-node-test:latest
        //         '''
        //     }
        // }
        // stage('Trivy Scan') {
        //     steps {
        //         sh '''
        //         docker run --rm \
        //         -v /var/run/docker.sock:/var/run/docker.sock \
        //         aquasec/trivy:latest image \
        //         --exit-code 1 \
        //         --severity HIGH,CRITICAL \
        //         tar3kom/nginx-node-test:latest
        //         '''
        //     }
        // }
        // -----------------------------------
        // 🐳 Trivy Image Scan (exit 0)
        // -----------------------------------
        stage('Trivy Image Scan') {
            steps {
                sh '''
                    docker run --rm \
                    -v /var/run/docker.sock:/var/run/docker.sock \
                    -v ${HOME_WORKSPACE}/output:/output \
                    aquasec/trivy:latest image \
                    --exit-code 0 \
                    --severity LOW,MEDIUM,HIGH,CRITICAL \
                    --output /output/trivy-image-report.txt \
                    tar3kom/nginx-node-test:latest
                '''
            }
        }

        stage('Archive Trivy Reports') {
            steps {
                sh "ls -a"
                archiveArtifacts artifacts: 'output/*.txt', onlyIfSuccessful: true
            }
        }

        // ----------------------
        // Deploy using local image
        // ----------------------
        stage('Deploy') {
            steps {
                sh '''
                    docker compose down --remove-orphans || true
                    docker compose up -d
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Build success and deployed!'
        }
        failure {
            echo '❌ Build failed. Please check logs.'
        }
        always {
            echo '📦 Build finished (success or fail).'
        }
    }
}
