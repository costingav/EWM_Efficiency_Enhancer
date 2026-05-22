
# EWM Efficiency Enhancer

## Overview
This application supports efficient creation and maintenance of materials in SAP EWM.

## Features
- Material / Warehouse maintenance
- SmartFilterBar and SmartTable UI
- Value Help (VH) integration for key fields
- CDS-based backend exposure

## Backend
- OData Service: ZEWM_MATERIAL_SRV
- CDS Views:
  - ZEWM_I_MATERIAL (interface)
  - ZEWM_C_MATERIAL (consumption)

## Frontend
- SAPUI5 (Freestyle App)
- Developed using SAP Fiori Tools

## Running Locally
```bash
npm install
npm start

##Deployment 
- npx fiori deploy

##Author
Costin Gavrilescu
