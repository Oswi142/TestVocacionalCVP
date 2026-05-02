# Test Vocacional CVP / Oswi142

Sistema de evaluación psicopedagógica y vocacional diseñado para administrar, calificar y generar reportes de tests estandarizados de manera automatizada.

## 🚀 Módulos del Sistema

Este proyecto incluye la implementación digital de los siguientes instrumentos:

1.  **CHASIDE**: Cuestionario de intereses y aptitudes vocacionales.
2.  **IPP-R**: Inventario de Intereses y Preferencias Profesionales - Revisado.
3.  **DAT**: Tests de Aptitudes Diferenciales (Razonamiento Verbal, Numérico, Abstracto, Mecánico, Espacial y Ortografía).
4.  **MACI**: Inventario Clínico para Adolescentes de Millon (Evaluación de personalidad).
5.  **Entrevista / Introducción**: Módulos de recolección de datos sociodemográficos y antecedentes.

## 🛠️ Tecnologías

- **Frontend**: React + TypeScript + Vite.
- **Backend**: Supabase (PostgreSQL + Auth).
- **Estilos**: Vanilla CSS (Premium Design).
- **Reportes**: jsPDF + autoTable.
- **Testing**: Vitest (Unitarios/DDT) y Playwright (E2E).

## 💻 Comandos de Desarrollo

Asegúrate de tener instaladas las dependencias antes de empezar:
```bash
npm install
```

### Ejecución Local
Para iniciar el servidor de desarrollo:
```bash
npm run dev
```

### Pruebas Unitarias (Vitest)
Hemos implementado **Data Driven Testing (DDT)** para asegurar la precisión de los cálculos de calificación.

- **Correr todos los tests unitarios**:
  ```bash
  npx vitest run tests/unit/
  ```
- **Ver el reporte de cobertura (Coverage)**:
  ```bash
  npx vitest run --coverage
  ```

### Pruebas End-to-End (Playwright)
Todos los tests de Playwright requieren que el servidor de desarrollo esté corriendo en una terminal separada (`npm run dev`).

> [!NOTE]
> Agrega el flag `--headed` para ver el navegador en acción, o quítalo para correr en modo silencioso.

- **Flujo completo del sistema (E2E):** Crea un cliente, completa los 6 tests vocacionales, verifica reportes y elimina el usuario.
  ```bash
  npx playwright test tests/e2e/e2eFullFlow.spec.ts --headed
  ```

- **Módulo de Login:** Prueba inicio de sesión válido (admin y cliente), credenciales inválidas y campos vacíos.
  ```bash
  npx playwright test tests/e2e/loginModuleTests.spec.ts --headed
  ```

- **Gestión de Usuarios (Admin CRUD):** Crea y elimina un usuario / Crea, edita y elimina un usuario.
  ```bash
  npx playwright test tests/e2e/adminUserManagementTests.spec.ts --headed
  ```

- **Control de Acceso (Rutas Protegidas):** Verifica que usuarios sin sesión, clientes y admins sean redirigidos correctamente.
  ```bash
  npx playwright test tests/e2e/accessControlTests.spec.ts --headed
  ```

- **Todos los tests unitarios (Vitest):**
  ```bash
  npx vitest run tests/unit/
  ```

- **Todos los tests E2E (Playwright):**
  ```bash
  npx playwright test --headed
  ```


## 🏗️ Estructura de Calificación
La lógica de negocio está desacoplada de la base de datos para facilitar el testing:
- `src/utils/*.ts`: Contiene los algoritmos de suma de puntajes, mapeo de baremos y generación de rankings profesionales.
- `tests/unit/*.test.ts`: Valida que cada respuesta simulada genere el perfil correcto del estudiante.

---
© 2026 - Oswi142 / CVP Test Vocacional
