# AI Interaction Record

This document highlights selected AI-assisted interactions that significantly influenced the development of our cloud-native application. Each example demonstrates how AI suggestions were critically evaluated, validated, and adapted.

---

## Session 1: PowerShell cURL Request Formatting Issue

### Prompt (you sent to AI)

Why does my POST request using curl in PowerShell fail when I include headers and JSON body?

### AI Response (trimmed)

Explained that PowerShell aliases `curl` to `Invoke-WebRequest`, which does not support the same syntax as standard curl. Suggested using:

- `Invoke-RestMethod` instead of curl
- Proper JSON formatting
- Using a dictionary for headers

### What Your Team Did With It

- **What was useful**
  - Identified that PowerShell does not use real curl by default
  - Suggested correct command (`Invoke-RestMethod`)
  - Explained proper header formatting

- **What was incorrect or incomplete**
  - Initial suggestion did not clearly show how to structure headers as a dictionary
  - Required adjustment to match API authentication format

- **What we changed**
  - Switched from:
    ```powershell
    curl -X POST ...
    ```
    to:
    ```powershell
    Invoke-RestMethod -Method POST `
      -Uri "http://localhost:8080/tasks" `
      -Headers @{ Authorization = "Bearer ece1779a4apikey" } `
      -Body '{"title":"Task 1","description":"Do something","status":"pending"}' `
      -ContentType "application/json"
    ```

- **How we verified correctness**
  - Successfully created tasks via API
  - Verified response contained task ID
  - Confirmed data persisted in PostgreSQL

---

## Session 2: Kubernetes ConfigMap Not Found in Job

### Prompt (you sent to AI)

My Kubernetes Job fails because it cannot find schema.sql even though I mounted a ConfigMap. What could be wrong?

### AI Response (trimmed)

Suggested checking:
- ConfigMap name
- volume mount path
- file keys inside ConfigMap

### What Your Team Did With It

- **What was useful**
  - Helped identify mismatch between ConfigMap name and reference in Job YAML
  - Suggested verifying mount paths and file structure

- **What was incorrect or incomplete**
  - I assumed the ConfigMap already existed, but it had not been created

- **What we changed**
  - Ensured ConfigMap was created/applied before Job
  - Verified YAML consistency:
    ```yaml
    volumes:
      - name: sql
        configMap:
          name: db-init-sql
    ```
  - Confirmed files mounted at `/sql`

- **How we verified correctness**
  - Checked Job logs:
    ```bash
    kubectl logs job/db-init -n ece1779
    ```
  - Confirmed schema.sql and seed.sql executed successfully

---

## Session 3: kubectl Cannot Connect to Cluster (Context Issue)

### Prompt (you sent to AI)

Why does `kubectl` fail with "Unable to connect to the server: dial tcp 127.0.0.1:xxxxx" when I try to get services or ingress?

### AI Response (trimmed)

Suggested that:
- The Kubernetes cluster might not be running
- The current context may point to a local cluster (e.g., minikube)
- Recommended checking:
  - `kubectl config current-context`
  - `kubectl config get-contexts`
  - switching context if needed

### What Your Team Did With It

- **What was useful**
  - Identified that `kubectl` was pointing to the wrong cluster (`minikube`)
  - Suggested checking contexts to diagnose the issue
  - Helped distinguish between local and cloud environments

- **What was incorrect or incomplete**
  - I initially assumed the cluster was down, but did not immediately identify context mismatch
  - Required manual inspection to confirm the issue

- **What we changed**
  - Checked current context:
    ```bash
    kubectl config current-context
    ```
  - Found it was set to `minikube`
  - Switched to DigitalOcean cluster:
    ```bash
    kubectl config use-context do-tor1-k8s-ece1779
    ```

- **How we verified correctness**
  - Successfully retrieved resources:
    ```bash
    kubectl get ingress -n ece1779
    kubectl get pods -n ece1779
    ```
  - Confirmed application is running with public ingress IP



