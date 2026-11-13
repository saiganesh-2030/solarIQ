# Contributing to SolarIQ

Thank you for your interest in contributing to SolarIQ! We welcome pull requests, bug reports, and enhancements.

## Development Workflow

1. **Fork and Clone the Repository:**
   ```bash
   git clone https://github.com/<your-username>/SolarIQ.git
   cd SolarIQ
   ```

2. **Set Up Python Virtual Environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r backend/requirements.txt
   pip install -r backend/requirements-dev.txt
   ```

3. **Run Backend & Development Server:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   ```
   Access the dashboard at `http://localhost:8000` and Swagger API docs at `http://localhost:8000/docs`.

4. **Run Test Suite:**
   ```bash
   cd backend
   python -m pytest
   ```

## Contribution Guidelines

- **Code Standards:** Adhere to PEP 8 for backend Python modules and clean ES6+ modular standards for the frontend (no build tools or heavy framework dependencies).
- **Wording Rules:** Maintain scientific and operational integrity:
  - Deviations must be referred to as *"investigation candidates"* or *"flagged for review"*. Never label deviations as equipment faults or defects.
  - Meteorological correlations must be presented as *"associations, not proof of cause"*.
  - Financial figures must be clearly designated as *"estimates"*.
- **Commit Messages:** Follow Conventional Commits format (`feat:`, `fix:`, `style:`, `test:`, `docs:`).
