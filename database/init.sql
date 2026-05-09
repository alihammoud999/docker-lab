CREATE DATABASE IF NOT EXISTS docker_lab;

USE docker_lab;

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO items (name, description)
VALUES
  ('Docker', 'Container platform for packaging and running applications'),
  ('Compose', 'Tool for running multi-container applications locally'),
  ('Swarm', 'Docker native clustering and orchestration mode'),
  ('ECR', 'Amazon Elastic Container Registry for storing Docker images');
