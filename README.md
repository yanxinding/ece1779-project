# ECE 1779 project - Yanxin Ding
# Cloud-Native Order and Inventory Management System

A **stateful cloud-native backend system** for order processing that preserves inventory correctness under concurrent requests. The project uses **Docker** and **Docker Compose** for local development, **PostgreSQL** for persistent relational state, and **Kubernetes** on **DigitalOcean** for orchestration, storage, and operations.
---

## Team Information
- **Name**: Yanxin Ding  
- **Student Number**: (1003790579)  
- **Email**: (yanxin.ding@mail.utoronto.ca)  

---

## Video Demo
- **URL**: https://youtu.be/fULKxoaDVyU 

---

## Deployment Information

- **Example products endpoint**: curl http://209.38.0.228/products
- **Example health check**: curl -i http://209.38.0.228/healthz
- **Deployment Provider**: DigitalOcean Kubernetes
- **Note**: This project exposes a backend API only; no separate frontend UI is implemented.

---

## Motivation

Modern backend systems must handle **stateful data** such as inventory levels and order status across concurrent requests, service restarts, and redeployments. A common failure mode in e-commerce-style systems is **inventory overselling**, where multiple requests decrement stock incorrectly under race conditions.

This project focuses on that **backend correctness problem** rather than building a full storefront UI. The aim is to demonstrate how cloud-native technologies—containerization, orchestration, persistent storage, monitoring, CI/CD, and backup automation—can be combined to build a **correct, reproducible, and observable stateful** service.

Target users include:
- end users who place orders and retrieve order status
- administrators or operators who manage inventory and system deployment

---

## Objectives

The objectives of this project are:

1. Provide REST APIs to list products and create/read orders.
2. Guarantee inventory correctness under concurrent order creation.
3. Support reproducible multi-container local development using Docker Compose.
4. Support orchestration with Kubernetes locally and in the cloud.
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
- **Monitoring / Observability**:
  - structured JSON logs from API and worker
  - DigitalOcean dashboards and alerts for CPU, memory, and disk

---

## Repository Structure
```text
.
├── services/
│   ├── api/
│   │   ├── src/index.js
│   │   ├── src/db.js
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
│   ├── 01-config.yaml
│   ├── 02-db-init-sql-configmap.yaml
│   ├── 03-postgres-pvc.yaml
│   ├── 04-postgres-statefulset.yaml
│   ├── 05-api-deployment.yaml
│   ├── 06-api-service.yaml
│   ├── 07-worker-deployment.yaml
│   ├── 08-ingress.yaml
│   ├── 09-db-init-job.yaml
│   └── 10-pg-backup.yaml
└── .github/workflows/
    └── cicd.yml
```

---

## System Overview

1.The application consists of three main components:

#### 1. API service

- exposes REST endpoints for health checks, product listing, order creation, and order lookup

- performs transactional inventory validation and order creation

#### 2. PostgreSQL

- stores products, orders, and order items

- persists state across restarts using volumes

#### 3. Worker service

- polls for pending orders

- asynchronously claims and confirms them

- simulates background processing such as payment or fulfillment

### Main Order Lifecycle

1. A client submits POST /orders.
2. The API validates the request.
3. The API opens a transaction and locks product rows with SELECT ... FOR UPDATE.
4. If inventory is sufficient, the API inserts a new order and order items, decrements stock, and commits.
5. The order is initially stored with status PENDING.
6. The worker claims one pending order using FOR UPDATE SKIP LOCKED.
7. The worker simulates asynchronous work and updates the order to CONFIRMED.

This design separates request-time correctness from background processing.

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

#### Stateful Design
- The project is explicitly stateful because inventory, orders, and processing status are stored in PostgreSQL rather than container memory.
- Persistent storage ensures state survives container or pod restarts.
- The API and worker coordinate through durable database state.

---

## Main Application Features

### Feature 1: Product Listing
- Endpoint: GET /products
- Returns all products with id, sku, name, and inventory.

### Feature 2: Create Order
- Endpoint: POST /orders
- Creates a new order with one or more items.
- Performs validation and concurrency-safe inventory checks.
- Returns the created order ID and initial status.

### Feature 3: Retrieve Order
- Endpoint: GET /orders/:id
- Returns order metadata and associated order items.
- Useful for checking whether the worker has confirmed the order.

### Feature 4: Concurrency-Safe Inventory Control
- Prevents overselling through:
- a single transaction per order
- row-level locking with SELECT ... FOR UPDATE
- deterministic locking order
- guarded inventory decrements

### Feature 5: Asynchronous Background Processing
- The worker polls for PENDING orders.
- Claims one order safely using FOR UPDATE SKIP LOCKED.
- Updates the order to CONFIRMED after simulated processing.

---

## Advanced Features

### Advanced Feature 1: CI/CD Pipeline
- GitHub Actions workflow builds Docker images
- Images pushed to DigitalOcean Container Registry
- Automated rollout to Kubernetes using `kubectl`

### Advanced Feature 2: Backup & Recovery
- Kubernetes CronJob runs scheduled `pg_dump`
- Backups uploaded to object storage (DigitalOcean Spaces)
- Restore procedure documented below

---

## API User Guide

### Health Check
- `GET /healthz`  
  Returns `ok` when database is reachable.

### List Products
- `GET /products`  
  Returns a list of products with inventory counts.

### Create Order
- `POST /orders`
```json
{
  "user_id": 1,
  "items": [
    { "product_id": 1, "quantity": 1 }
  ]
}
```

### Get Order by ID
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

## User Flow Demonstration

A typical flow for a grader is:
1. Start the local stack with Docker Compose.
2. Call GET /healthz to verify service health.
3. Call GET /products to inspect current inventory.
4. Submit POST /orders to create a new order.
5. Inspect worker logs to observe job_claimed and job_confirmed.
6. Call GET /orders/:id again to verify the order moved from PENDING to CONFIRMED.
7. Restart containers and verify the database state still exists.

---

## Development Guide

### Prerequisites
Install:
- Docker Desktop
- kubectl
- minikube
- Git

For cloud deployment also install:
- doctl
- access to a DigitalOcean Kubernetes cluster and registry

### Local Development with Docker Compose
Make sure you have started Docker.
Then start the full local system:
```bash
docker compose -f infra/compose/docker-compose.yml up -d --build
```

#### Check running services:
```bash
docker compose -f infra/compose/docker-compose.yml ps
```

#### View logs:
```bash
docker compose -f infra/compose/docker-compose.yml logs -f
```

### Local Verification
```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/products
```

#### Create an order:
```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"items":[{"product_id":1,"quantity":1}]}'
```

### Persistence Check
```bash
docker compose -f infra/compose/docker-compose.yml down
docker compose -f infra/compose/docker-compose.yml up -d
curl http://localhost:8080/orders/1
```

---

## Kubernetes Deployment (minikube)

```bash
minikube start
minikube addons enable ingress
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -n ece1779 -f k8s/
```

If db-init-sql is defined as its own manifest, apply that as part of k8s/ before the job runs.
Check resources:
```bash
kubectl get all -n ece1779
kubectl get pvc -n ece1779
kubectl get ingress -n ece1779
```

Port-forward for local testing if needed:
```bash
kubectl port-forward -n ece1779 deployment/api 8080:8080
```

---

## Backup & Recovery
### Backup
```bash
kubectl create job --from=cronjob/pg-backup manual-backup -n ece1779
kubectl logs job/manual-backup -n ece1779
```

### Restore Example
```bash
kubectl -n ece1779 exec -it postgres-0 --   pg_restore -U postgres -d cloud_db --clean --if-exists backup.dump
```

---

## AI Assistance & Verification (Summary)
AI tools were used mainly for:
- Kubernetes configuration review
- documentation refinement
- debugging guidance for local and Kubernetes setup

One representative limitation was that AI suggestions sometimes assumed missing Kubernetes resources already existed, such as supporting ConfigMaps for initialization jobs. Those suggestions were not accepted blindly. They were verified by checking actual manifests, running **kubectl describe**, reading pod events, and correcting the configuration accordingly.
All AI-generated output was verified via local and cloud testing.

Correctness was verified through:
- live API testing with curl
- Docker Compose and Kubernetes logs
- worker lifecycle verification (PENDING to CONFIRMED)
- manual inspection of PostgreSQL state
- testing concurrency behavior for insufficient inventory
- validating backup-related manifests and restore steps

Concrete examples are documented in ai-session.md.

---

## Individual Contributions
This project was completed individually by Yanxin Ding.

---

## Lessons Learned
- Correct state management requires careful transaction design.
- Kubernetes reproducibility depends heavily on documentation.
- Backups are only meaningful when restore procedures are tested.
