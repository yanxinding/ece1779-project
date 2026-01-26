# Cloud-Native Order and Inventory Management System
## 1. Motivation

Modern backend systems increasingly rely on cloud-native architectures to ensure scalability, reliability, and maintainability. In particular, e-commerce and logistics platforms, such as Amazon, must manage **stateful data** such as inventory levels and order status while remaining resilient to failures, redeployments, and concurrent access. Incorrect handling of state, such as overselling inventory, can lead to serious business and user trust issues.

Motivated by one of the example project ideas, this project is to design and implement a **stateful cloud-native backend service** that focuses on **order processing and inventory consistency**, rather than a full end-to-end e-commerce platform. By narrowing the scope to these critical backend concerns, the project emphasizes the core learning objectives of ECE1779, and solves the problem of maintaining correct and persistent application state under concurrent access, service restarts, and cloud-based orchestration.

The target users are:
- End users who place orders and track their order status
- Administrators who manage product inventory

This project is worth pursuing because it reflects real-world backend system challenges while remaining feasible within the course timeline and scope. Existing large-scale e-commerce systems might be overly complex for instructional purposes. This project instead demonstrates how a well-scoped, cloud-native system can provide correctness guarantees and resilience using modern cloud technologies.

---

## 2. Objectives and Key Features
### Project Objectives

The primary objective is to build and deploy a **stateful order and inventory management backend** that:
- Persists data reliably across container restarts and redeployments
- Prevents inventory inconsistencies under concurrent access
- Demonstrates containerization, orchestration, and monitoring in a real cloud environment
- Is fully reproducible and observable

### Core Technical Features
#### Containerization and Local Development
- All services are containerized using **Docker**
- **Docker Compose** is used for local multi-container developments:
  - API service
  - Background worker service
  - PostgreSQL database

#### State Management
- **PostgreSQL** as the primary relational database
- Data includes users, products, orders, and order items
- Inventory updates are performed using database transactions and row-level locks
- **Persistent storage** with DigitalOcean Volumes ensures state survives container and pod restarts

#### Deployment Provider
- The system is deployed to **DigitalOcean**
- A managed **DigitalOcean Kubernetes (DOKS)** cluster is used for production deployment

#### Orchestration (Kubernetes)
- **minikube** for local Kubernetes testing
- Kubernetes components include:
  - Deployments for API and worker services
  - Services for internal communication
  - Ingress for external access
  - PersistentVolume and PersistentVolumeClaim for PostgreSQL

#### Monitoring and Observability
- DigitalOcean monitoring to observe:
  - CPU and memory usage
  - Disk usage for persistent volumes
- Basic alerts are configured for resource thresholds
- Application logs are used to trace request handling and background job execution

### Advanced Features 

1. **CI/CD Pipeline**
   - GitHub Actions automates:
     - Building Docker images
     - Pushing images to a container registry
     - Deploying updates to the Kubernetes cluster

2. **Backup and Recovery**
   - A Kubernetes CronJob performs scheduled `pg_dump` backups
   - Backups are uploaded to DigitalOcean Spaces
   - Restore procedures are documented and tested

### Feasibility and Scope

The project scope is intentionally limited to two backend services and a single database to ensure feasibility within the course and teamsize timeline. While inspired by microservice architectures, the design avoids unnecessary service proliferation and focuses on correctness, deployment, and observability.

---

## 3. Tentative Plan
### Week 1–2
- Finalize system design and database schema
- Implement API service core endpoints
- Set up PostgreSQL schema and local Docker Compose environment

### Week 3–4
- Implement inventory-safe order creation using transactions
- Implement background worker service
- Add authentication and authorization
- Begin Kubernetes manifests for local deployment (minikube)

### Week 5
- Deploy to DigitalOcean Kubernetes
- Configure persistent volumes and ingress
- Set up monitoring dashboards and alerts

### Week 6
- Implement CI/CD pipeline
- Implement backup and recovery mechanism
- Prepare presentation demo and slides
- Finalize documentation and testing

### Team Responsibilities
This project is completed by a single author.
---

## 4. Initial Independent Reasoning (Before Using AI)
### Architecture Choices
While **DigitalOcean** is the mandatory choice for this project, we decided to use **Kubernetes on DigitalOcean** for richer features set, better ecosystem support, and closer alignment with industrial practices. PostgreSQL was selected for its transactional guarantees. 

### Anticipated Challenges
The primary challenge is expected to be **debugging issues after the initial setup**. Unlike conventional coding projects, this project involves multiple layers of components communicating with each other. Failures may arise from configuration or environment mismatches rather than application logic. Based on prior experience on course assignments, identifying root causes in such a distributed setup can be non-trivial and requires extensive testign and research.


### Early Development Approach
The initial plan was to first build a correct local system using Docker Compose, then incrementally migrate it to Kubernetes. We also utilize course asssignment instructions to facilitate setups.

---

## 5. AI Assistance Disclosure

### Use of AI
- after initial draft of proposal, AI tools are used to rephrase, as well as double checking our planning fulfills all requirement of the project.

1. The initial planning, thinking, drafting were developed **without** AI assistance.
2. Rephrasing, grammer/typo check, project requirement double checking were done **with** AI assistance. We also asked AI to check if our tentitive planning is feasable. 
3. AI suggested us to add one more advanced feature, for example security enhancement using HTTPS; however, consider the team size and timeline we decided to ignore this suggestion.
---

