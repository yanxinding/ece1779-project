# ECE 1779 project - Yanxin Ding

A **stateful cloud-native backend service** that processes orders while maintaining **inventory consistency under concurrent access**, implemented using **Docker**, **Docker Compose**, and **Kubernetes on DigitalOcean**.

---

## Team Information
- **Name**: Yanxin Ding  
- **Student Number**: (fill)  
- **Email**: (fill)  

---

## Video Demo
- **URL**: (fill — YouTube / Google Drive / Dropbox)

---

## Motivation
Modern backend systems must correctly manage **stateful data** such as inventory and order status across restarts, redeployments, and concurrent requests. A common failure mode in e-commerce systems is **overselling inventory**, which occurs when multiple requests update stock without proper transactional guarantees.

This project focuses on the backend core problem of **order processing and inventory correctness**, rather than a full end-to-end e-commerce platform. The goal is to demonstrate how cloud-native technologies—containerization, orchestration, persistent storage, monitoring, and automation—can be combined to build a **correct, reproducible, and observable** system.

---

## Objectives
1. Provide REST APIs to list products and create/read orders.
2. Guarantee inventory correctness under concurrent order creation.
3. Support local development using Docker Compose.
4. Deploy to Kubernetes (minikube locally, DigitalOcean Kubernetes in the cloud).
5. Persist database state across restarts using cloud storage.
6. Demonstrate monitoring and operational visibility.
7. Implement at least two advanced features:
   - CI/CD pipeline
   - Automated backup and recovery

---

## Technical Stack
- **Backend**: Node.js + Express  
- **Database**: PostgreSQL  
- **Containerization**: Docker  
- **Local Orchestration**: Docker Compose  
- **Cloud Orchestration**: Kubernetes (minikube + DigitalOcean Kubernetes)  
- **Persistent Storage**:
  - Local: Docker named volumes  
  - Cloud: DigitalOcean Block Storage (PVC)  
- **CI/CD**: GitHub Actions + DigitalOcean Container Registry (DOCR)  
- **Backups**: Kubernetes CronJob + object storage (DigitalOcean Spaces)  
- **Observability**: Structured JSON logs + DigitalOcean monitoring dashboards  

---

## Repository Structure
```text
.
├── services/
│   ├── api/
│   │   ├── src/index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── worker/
│       ├── src/index.js
│       ├── package.json
│       └── Dockerfile
├── db/
│   ├── schema.sql
│   └── seed.sql
├── infra/
│   └── compose/
│       └── docker-compose.yml
├── k8s/
│   ├── 00-namespace.yaml
│   ├── 01-api-deployment.yaml
│   ├── 02-worker-deployment.yaml
│   ├── 03-postgres-pvc.yaml
│   ├── 04-postgres-statefulset.yaml
│   ├── 05-postgres-svc.yaml
│   ├── 06-api-svc.yaml
│   ├── 07-ingress.yaml
│   ├── 08-api-config.yaml
│   ├── 09-db-init-job.yaml
│   └── 10-pg-backup.yaml
└── .github/workflows/
    └── cicd.yml
```

---

## Features and Course Requirements Mapping

### Core Technical Requirements

#### Docker & Docker Compose
- Multi-container local setup: PostgreSQL + API + Worker
- Reproducible local development environment

#### PostgreSQL & Persistent Storage
- Relational database stores users, products, orders, and order items
- Inventory updates performed inside transactions
- Persistent volumes ensure state survives restarts

#### Deployment Provider
- Deployed to **DigitalOcean Kubernetes (DOKS)**

#### Orchestration
- Kubernetes Deployments for API and worker
- PostgreSQL StatefulSet with PersistentVolumeClaim
- Services and Ingress for networking

#### Monitoring & Observability
- Structured JSON logs from API and worker
- DigitalOcean dashboards used to monitor CPU, memory, disk usage
- Alerts configured for abnormal resource usage

---

## Advanced Features

### CI/CD Pipeline
- GitHub Actions workflow builds Docker images
- Images pushed to DigitalOcean Container Registry
- Automated rollout to Kubernetes using `kubectl`

### Backup & Recovery
- Kubernetes CronJob runs scheduled `pg_dump`
- Backups uploaded to object storage (DigitalOcean Spaces)
- Restore procedure documented below

---

## API User Guide

### Health Check
- `GET /healthz`  
  Returns `ok` when database is reachable.

### Products
- `GET /products`  
  Returns a list of products with inventory counts.

### Orders
- `POST /orders`
```json
{
  "user_id": 1,
  "items": [
    { "product_id": 1, "quantity": 1 }
  ]
}
```

- `GET /orders/:id`  
  Returns order metadata and associated items.

---

## Inventory Correctness Design
Inventory consistency is enforced using:
- A **single database transaction** per order
- `SELECT ... FOR UPDATE` row-level locks
- Deterministic locking order to avoid deadlocks
- Guarded updates (`inventory >= quantity`) to prevent negative stock

Under concurrent requests, at most the available inventory can be sold; excess requests receive a conflict response.

---

## Local Development (Docker Compose)

### Start
```bash
docker compose -f infra/compose/docker-compose.yml up -d --build
```

### Verify
```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/products
```

---

## Kubernetes Deployment (minikube)

```bash
minikube start
minikube addons enable ingress
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -n ece1779 -f k8s/
```

---

## Backup & Recovery

### Restore Example
```bash
kubectl -n ece1779 exec -it postgres-0 --   pg_restore -U postgres -d cloud_db --clean --if-exists backup.dump
```

---

## AI Assistance & Verification (Summary)
AI tools were used for Kubernetes configuration, CI/CD workflows, and documentation refinement. All AI-generated output was verified via local and cloud testing.

---

## Individual Contributions
This project was completed by a single author.

---

## Lessons Learned
- Correct state management requires careful transaction design.
- Kubernetes reproducibility depends heavily on documentation.
- Backups are only meaningful when restore procedures are tested.
