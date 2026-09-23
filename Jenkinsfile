pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                sh 'git pull origin main'
            }
        }
	stage('Dependency-Check') {
            steps {
                withCredentials([string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')]) {
                    dependencyCheck additionalArguments: '--scan . --format ALL --project Blog --nvdApiKey ${NVD_API_KEY}', odcInstallation: 'OWASP-DC'
                }
            }
        }
        stage('Build') {
            steps {
                sh 'docker build --pull --rm -f "Dockerfile" -t blog:latest "."'
            }
        }
	stage('Trivy Scan') {
	    steps {
	        sh 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --exit-code 0 --severity HIGH,CRITICAL blog:latest'
	    }
	}
        stage('Run') {
            steps {
                sh 'docker stop blog || true'
                sh 'docker rm blog || true'
                sh 'docker run -d -p 3000:3000 --name blog blog'
            }
        }
	stage('Nikto Scan') {
	    steps {
		sh 'docker run --rm --network host -v $WORKSPACE:/tmp ghcr.io/sullo/nikto:latest -h http://localhost:3000 -Format txt -o /tmp/nikto-report.txt'
	    }
	}
    }
    post {
        always {
            dependencyCheckPublisher pattern: 'dependency-check-report.xml'
        }
    }
}
