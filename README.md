# Tuudii Clinic Connect

I want to build a Clinic Management System for KILINIKA G/GALEESSA TUUDII – TWO D MEDIUM CLINIC.

The first version must have exactly three departments:

1. RECEPTION – patient registration, unique patient ID, patient search, appointments, walk-in registration and patient queue.

2. OPD – patient consultation, vital signs, medical history, diagnosis, treatment notes and laboratory requests.

3. LABORATORY – laboratory worklist, test requests, specimen collection, test processing, result entry, verification and printable reports.

The departments must share one patient database. A patient registered at reception must be available in OPD. Laboratory requests created in OPD must appear in the laboratory worklist. Verified laboratory results must return to the correct OPD patient record.

Use React, TypeScript, Tailwind CSS and Supabase PostgreSQL. Implement authentication and role-based permissions for administrator, receptionist, OPD clinician and laboratory technician.

Use my clinic logo and supplied laboratory request form as design references. Use royal blue, white and light blue as the main colors.

For now, DO NOT build the entire application. First provide:

- Complete system architecture.

- Screen-by-screen navigation and layout.

- Database tables and relationships.

- Staff roles and permissions.

- Patient workflow between the three departments.

- Phased implementation plan.

Make this suitable for a real small outpatient clinic. Use fictional patient records during development. Do not use real patient data.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f9ad2ee7-6c8b-4732-a1bf-6b352ed14298).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
