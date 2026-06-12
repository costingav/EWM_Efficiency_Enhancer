

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog"
], function (Controller, JSONModel, ValueHelpDialog) {

    "use strict";

    return Controller.extend("bearingpoint.ewm.materialmaintenance.controller.Materials", {

onInit: function () {
    var oView = this.getView();

var oModel = oView.getModel();

if (oModel) {
    oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
} else {
    oView.attachEventOnce("modelContextChange", function () {
        var oModelLater = this.getView().getModel();
        if (oModelLater) {
            oModelLater.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
        }
    }.bind(this));
}

    var oSmartTable = oView.byId("LineItemsSmartTable");
    var oSmartFilterBar = oView.byId("smartFilterBar");


if (oSmartFilterBar) {
    oSmartFilterBar.attachSearch(function () {

        var aInvalidFields = [];

        oSmartFilterBar.getAllFilterItems().forEach(function (oItem) {

            var oControl = oItem.getControl();
            if (!oControl) {
                return;
            }

            var sValue = "";

            if (oControl.getValue) {
                sValue = oControl.getValue();
            } else if (oControl.getSelectedKey) {
                sValue = oControl.getSelectedKey();
            }

            //  check invalid length (generic safety)
            if (sValue && sValue.length > 4) {
                oControl.setValue("");
                oControl.setSelectedKey && oControl.setSelectedKey("");

                aInvalidFields.push(oItem.getLabel());
            }

        });

        //  User feedback (clean UX)
        if (aInvalidFields.length > 0) {
            sap.m.MessageToast.show(
                "Some filters were cleared because of invalid values."
            );
        }

    }.bind(this));
}


    // ===============================
    // View model
    // ===============================
    var oViewModel = new JSONModel({
        rowViewMode: "Detailed"
    });
    oView.setModel(oViewModel, "viewModel");

    // ===============================
    // SmartTable init
    // ===============================
    oSmartTable.attachInitialise(function () {

        var oTable = oSmartTable.getTable();
        this.table = oTable;

this.getView().byId("_IDGenButton").setEnabled(false);
this.getView().byId("_MassChange").setEnabled(false);


        if (oTable) {

            if (oTable.isA("sap.m.Table")) {
                oTable.setMode("MultiSelect");
            }

            oTable.attachSelectionChange(this.onTableSelectionChange.bind(this));

var oTable = this.table;

            if (oTable.attachUpdateFinished) {
                
oTable.attachUpdateFinished(function () {

    this._scheduleRowViewSetup();
    this._wireGenericVHValidation();

    setTimeout(function () {
        this._applyEntitledReadOnly();
    }.bind(this), 200);

   
    if (this.table && this.table.removeSelections) {
        this.table.removeSelections(true);
    }

    this.onTableSelectionChange();

}.bind(this));

            }
        }

        this._scheduleRowViewSetup();

        //  IMPORTANT: apply after init render
        setTimeout(function () {
            this._applyEntitledReadOnly();
        }.bind(this), 200);

    }.bind(this));

    // ===============================
    // Page navigation hook
    // ===============================
    oView.addEventDelegate({
        onAfterShow: function () {

if (oSmartFilterBar) {
    oSmartFilterBar.clear();
}

            this._scheduleRowViewSetup();
            this._wireGenericVHValidation();

            //  IMPORTANT: ensure binding ready
            setTimeout(function () {
                this._applyEntitledReadOnly();
            }.bind(this), 200);

        }.bind(this)
    });


    // ===============================
    //  ValueHelpDialog patch (FINAL - MultiSelect + hide Warehouse)
    // ===============================
    if (oSmartFilterBar && !this._vhPatched) {
        this._vhPatched = true;

        var fnOrigAfterRendering = ValueHelpDialog.prototype.onAfterRendering;

        ValueHelpDialog.prototype.onAfterRendering = function () {

            if (fnOrigAfterRendering) {
                fnOrigAfterRendering.apply(this, arguments);
            }

            var oDialog = this;

            setTimeout(function () {

                try {

                    //  ensure this is ValueHelpDialog
                    if (!oDialog || !oDialog.isA("sap.ui.comp.valuehelpdialog.ValueHelpDialog")) {
                        return;
                    }

                    var oTable = oDialog.getTable && oDialog.getTable();
                    if (!oTable) {
                        return;
                    }

                    //  KEEP MULTISELECT (checkboxes)
                    if (oTable.isA("sap.m.Table")) {
                        oTable.setMode("MultiSelect");
                    }

                    //  robust hide logic
                    var fnHideLgnum = function () {

                        var aCols = oTable.getColumns() || [];
                        var aItems = oTable.getItems() || [];

                        //  fallback if no data yet
                        if (aItems.length === 0) {
                            aCols.forEach(function (oCol) {
                                var oHeader = oCol.getHeader && oCol.getHeader();
                                var sHeader = oHeader && oHeader.getText && oHeader.getText();

                                if (sHeader && sHeader.toLowerCase().includes("warehouse")) {
                                    oCol.setVisible(false);
                                }
                            });
                            return;
                        }

                        var aCells = aItems[0].getCells();

                        aCols.forEach(function (oCol, i) {

                            if (!aCells[i]) {
                                return;
                            }

                            var oBinding = aCells[i].getBinding && aCells[i].getBinding("text");
                            var sPath = oBinding && oBinding.getPath && oBinding.getPath();

                            //  flexible detection
                            if (sPath && sPath.toLowerCase().includes("lgnum")) {
                                oCol.setVisible(false);
                            }
                        });
                    };

                    //  initial hide
                    fnHideLgnum();

                    //  reapply AFTER every refresh (CRITICAL)
                    if (oTable.attachUpdateFinished) {
                        if (oDialog._vhHideHandler) {
                            oTable.detachUpdateFinished(oDialog._vhHideHandler);
                        }

                        oDialog._vhHideHandler = fnHideLgnum;
                        oTable.attachUpdateFinished(oDialog._vhHideHandler);
                    }

                } catch (e) {
                    console.log("VH patch error:", e);
                }

            }, 300);
        };
    }
},
_getVhValidationConfig: function () {
    return [

        {
            fieldPath: "StorageBinType",
            headerText: "Storage Bin",
            entitySet: "/ZEWM_I_LPTYPVH",
            warehouseField: "WarehouseNo",
            valueField: "StorageBinType",
            message: "Invalid Storage Bin Type. Use Value Help."
        },

        {
            fieldPath: "CtrlIndicatorProcessType",
            headerText: "Proc.Type Det.",
            entitySet: "/ZEWM_I_PTDETINDVH",
            warehouseField: "Lgnum",
            valueField: "CtrlIndicatorProcessType",
            message: "Invalid Proc.Type Det. Ind. Use Value Help."
        },

        {
            fieldPath: "ProductLoadCategory",
            headerText: "Prod. Load",
            entitySet: "/ZEWM_I_WRKLDGRVH",
            warehouseField: "WarehouseNo",
            valueField: "ProductLoadCategory",
            message: "Invalid Product Load Category. Use Value Help."
        },

        {
            fieldPath: "BulkStorage",
            headerText: "Bulk Storage",
            entitySet: "/ZEWM_I_BULKSTORAGEVH",
            warehouseField: "Lgnum",
            valueField: "BLOCK",
            message: "Invalid Bulk Storage. Use Value Help."
        },

        {
            fieldPath: "PutawayControl",
            headerText: "Putaway Control",
            entitySet: "/ZEWM_I_PUTAWAYVH",
            warehouseField: "Lgnum",
            valueField: "PutStra",
            message: "Invalid Putaway Control. Use Value Help."
        },

        {
            fieldPath: "StorSectInd",
            headerText: "Storage Sect",
            entitySet: "/ZEWM_I_STORAGESECTIONVH",
            warehouseField: "Lgnum",
            valueField: "LGBKZ",
            message: "Invalid Storage Section Indicator. Use Value Help."
        },

        {
            fieldPath: "StockRemovalCtrl",
            headerText: "Stock Removal",
            entitySet: "/ZEWM_I_STOCKREMOVALVH",
            warehouseField: "Lgnum",
            valueField: "REM_STRA",
            message: "Invalid Stock Removal Control. Use Value Help."
        },

        {
            fieldPath: "StockDeterminationGroup",
            headerText: "Stk Det. Group",
            entitySet: "/ZEWM_I_STCKDETGRVH",
            warehouseField: "WarehouseNo",
            valueField: "StockDeterminationGroup",
            message: "Invalid Stock Determination Group. Use Value Help."
        },

        {
            fieldPath: "QualityInspectionGroup",
            headerText: "Quality Insp.",
            entitySet: "/ZEWM_I_QGRPVH",
            warehouseField: null,
            valueField: "QualityInspectionGroup",
            message: "Invalid Quality Inspection Group. Use Value Help."
        },

        {
            fieldPath: "CycleCountingIndicator",
            headerText: "Cyc.Count Ind.",
            entitySet: "/ZEWM_I_CCINDVH",
            warehouseField: "WarehouseNo",
            valueField: "CycleCountingIndicator",
            message: "Invalid Cycle Counting Indicator. Use Value Help."
        },

        {
            fieldPath: "QuantityClassMerchandiseDistr",
            headerText: "Quant Class.",
            entitySet: "/ZEWM_I_QUANCLAVH",
            warehouseField: null,
            valueField: "QuantityClassMerchandiseDistr",
            message: "Invalid Quantity Classification. Use Value Help."
        },

        {
            fieldPath: "ProcBlockProfile",
            headerText: "Process Block",
            entitySet: "/ZEWM_I_PROCPRFLVH",
            warehouseField: "WarehouseNo",
            valueField: "ProcBlockProfile",
            message: "Invalid Process Block Profile. Use Value Help."
        },


{
            fieldPath: "WeightIndicator",
            headerText: "Weight Indicator",
            entitySet: "/ZEWM_I_WEIGHTINDVH",
            warehouseField: "Lgnum",
            valueField: "WeightIndicator",
            message: "Invalid Weight Indicator. Use Value Help."
        },

 {
            fieldPath: "VolumeIndicator",
            headerText: "Volume Indicator",
            entitySet: "/ZEWM_I_VOLUMEINDVH",
            warehouseField: "Lgnum",
            valueField: "VolumeIndicator",
            message: "Invalid Volume Indicator. Use Value Help."
        },


    ];
},

_forceTableRefresh: function () {
    var oSmartTable = this.byId("LineItemsSmartTable");
    var oModel = this.getView().getModel();

    if (oModel) {
        oModel.refresh(true); // force backend reload
    }

    if (oSmartTable && oSmartTable.rebindTable) {
        oSmartTable.rebindTable(true);
    }
},

_resolveInputFromCell: function (oCell) {

    if (!oCell) {
        return null;
    }

    // SmartField → extract inner control
    if (oCell.isA && oCell.isA("sap.ui.comp.smartfield.SmartField")) {
        var aInner = oCell.getInnerControls && oCell.getInnerControls();
        if (aInner && aInner.length) {
            return aInner[0]; //  this is the real input
        }
    }

    // Direct input types
    if (
        oCell.isA && (
            oCell.isA("sap.m.Input") ||
            oCell.isA("sap.m.ComboBox") ||
            oCell.isA("sap.m.MultiInput")
        )
    ) {
        return oCell;
    }

    // fallback: try aggregated objects
    if (oCell.findAggregatedObjects) {
        var aInputs = oCell.findAggregatedObjects(true, function (oControl) {
            return oControl.isA && (
                oControl.isA("sap.m.Input") ||
                oControl.isA("sap.m.ComboBox") ||
                oControl.isA("sap.m.MultiInput")
            );
        });

        return aInputs.length ? aInputs[0] : null;
    }

    return null;
},



_findColumnIndexByHeaderText: function (oTable, sHeaderContains) {
    var aColumns = oTable.getColumns() || [];

    for (var i = 0; i < aColumns.length; i++) {
        var oHeader = aColumns[i].getHeader && aColumns[i].getHeader();
        var sText = oHeader && oHeader.getText && oHeader.getText();

        if (sText && sText.indexOf(sHeaderContains) !== -1) {
            return i;
        }
    }

    return -1;
},



_getCellValue: function (oCell) {
    if (!oCell) {
        return "";
    }

    if (oCell.getText) {
        return oCell.getText();
    }

    if (oCell.getValue) {
        return oCell.getValue();
    }

    if (oCell.getSelectedKey) {
        return oCell.getSelectedKey();
    }

    return "";
},


onSaveData: async function () {
    var oModel = this.getView().getModel();
    var oSmartTable = this.byId("LineItemsSmartTable");

    await new Promise(function (resolve) {
        setTimeout(resolve, 250);
    });

    var bValid = await this._validateAllConfiguredVHFieldsBeforeSave();

    if (!bValid) {
        sap.m.MessageBox.error("Fix highlighted fields before saving.");
        return false;
    }

    
if (!oModel.hasPendingChanges()) {
    console.log("No changes to save - skipping");
    return true;
}

console.log("Pending changes =", oModel.hasPendingChanges());

    
oModel.submitChanges({

    success: function (oResponse) {

        //check for backend errors
        if (oResponse && oResponse.__batchResponses) {

            var bHasError = oResponse.__batchResponses.some(function (oBatch) {

                if (oBatch.__changeResponses) {
                    return oBatch.__changeResponses.some(function (oChange) {
                        return oChange.response && oChange.response.statusCode >= 400;
                    });
                }

                return oBatch.response && oBatch.response.statusCode >= 400;
            });

            if (bHasError) {
                sap.m.MessageBox.error("Error during save. Please check fields.");
                return;
            }
        }

        sap.m.MessageToast.show("Data successfully saved");

    }.bind(this),

    error: function () {
        sap.m.MessageBox.error("Error during save");
    }
});

},



_wireGenericVHValidation: function () {

    var oSmartTable = this.byId("LineItemsSmartTable");
    var oTable = oSmartTable && oSmartTable.getTable();
    var aCfg = this._getVhValidationConfig();

    if (!oTable || !oTable.getItems) {
        return;
    }

    aCfg.forEach(function (oCfg) {

        var iColIdx = this._findColumnIndexByHeaderText(oTable, oCfg.headerText);

        if (iColIdx < 0) {
            console.log("Column not found for:", oCfg.fieldPath);
            return;
        }

        oTable.getItems().forEach(function (oItem) {

            var oCell = oItem.getCells()[iColIdx];
            var oInput = this._resolveInputFromCell(oCell);

            if (!oInput) {
                console.log("No input resolved for:", oCfg.fieldPath);
                return;
            }

            var sAttachKey = "vhValidationAttached_" + oCfg.fieldPath;

            // avoid attaching twice
            if (oInput.data(sAttachKey)) {
                return;
            }

            oInput.data(sAttachKey, true);

            //  SAFE attachChange
           
if (oInput && (oInput.attachChange || oInput.attachLiveChange)) {

    var fnHandler = function () {

        setTimeout(function () {

            var sWarehouseNo = this._getRowWarehouseNo(oItem);

            console.log("Change detected for:", oCfg.fieldPath);

            this._validateVHField(oInput, sWarehouseNo, oCfg);

        }.bind(this), 200);
    }.bind(this);

    if (oInput.attachChange) {
        oInput.attachChange(fnHandler);
    }

    if (oInput.attachLiveChange) {
        oInput.attachLiveChange(fnHandler);
    }
}

            //  fallback for controls without attachChange
            else if (oInput.attachLiveChange) {

                oInput.attachLiveChange(function () {

                    setTimeout(function () {

                        var sWarehouseNo = this._getRowWarehouseNo(oItem);

                        this._validateVHField(oInput, sWarehouseNo, oCfg);

                    }.bind(this), 200);

                }.bind(this));

            }
            else {
                console.log("No change event available for control:", oInput);
            }

        }.bind(this));

    }.bind(this));
},


_validateVHField: function (oInput, sWarehouseNo, oCfg) {

    var oModel = this.getView().getModel();

    var sValue = "";
    if (oInput && oInput.getValue) {
        sValue = oInput.getValue();
    }
    sValue = (sValue || "").trim();

    console.log("Validating:", oCfg.fieldPath, "Value:", sValue);

    // ----------------------------------
    // EMPTY VALUE → ALWAYS VALID
    // ----------------------------------
    if (!sValue) {

        if (oInput && oInput.setValueState) {
            oInput.setValueState("None");
            oInput.setValueStateText("");
        }

        return Promise.resolve(true);
    }

    // ----------------------------------
    // VALIDATION VIA VH CDS
    // ----------------------------------
    return new Promise(function (resolve) {

        var aFilters = [];

        if (oCfg.warehouseField && sWarehouseNo) {
            aFilters.push(new sap.ui.model.Filter(
                oCfg.warehouseField,
                sap.ui.model.FilterOperator.EQ,
                sWarehouseNo
            ));
        }

        aFilters.push(new sap.ui.model.Filter(
            oCfg.valueField,
            sap.ui.model.FilterOperator.EQ,
            sValue
        ));

        oModel.read(oCfg.entitySet, {
            filters: aFilters,

            
success: function (oData) {

    var bValid = !!(oData && oData.results && oData.results.length > 0);

    //  ALWAYS push value to model (CRITICAL FIX)
  
var oCtx = oInput.getBindingContext();
var sPath = oInput.getBinding("value")?.getPath();

if (oCtx && sPath) {
    this.getView().getModel().setProperty(sPath, sValue, oCtx);
}


    if (bValid) {

        if (oInput && oInput.setValueState) {
            oInput.setValueState("None");
            oInput.setValueStateText("");
        }

    } else {

        if (oInput && oInput.setValueState) {
            oInput.setValueState("Error");
            oInput.setValueStateText(oCfg.message);
        }

    }

    resolve(bValid);
}

        });

    });
},



_validateAllConfiguredVHFieldsBeforeSave: function () {
    var oSmartTable = this.byId("LineItemsSmartTable");
    var oTable = oSmartTable && oSmartTable.getTable();
    var aCfg = this._getVhValidationConfig();

    if (!oTable || !oTable.getItems) {
        return Promise.resolve(true);
    }

    var aPromises = [];

    aCfg.forEach(function (oCfg) {
        var iColIdx = this._findColumnIndexByHeaderText(oTable, oCfg.headerText);
        if (iColIdx < 0) {
            return;
        }

        oTable.getItems().forEach(function (oItem) {
            var oCell = oItem.getCells()[iColIdx];
            var oInput = this._resolveInputFromCell(oCell);

            if (!oInput) {
                return;
            }

            var sWarehouseNo = this._getRowWarehouseNo(oItem);
            aPromises.push(this._validateVHField(oInput, sWarehouseNo, oCfg));
        }.bind(this));
    }.bind(this));

    return Promise.all(aPromises).then(function (aResults) {
        

var bAllValid = true;

aResults.forEach(function (bValid, index) {
    if (!bValid) {
        console.log("Invalid field detected in validation index:", index);
        bAllValid = false;
    }
});


if (!bAllValid) {
    console.log("Validation failed - preventing submit");
}

return bAllValid;

    });
},

_getRowWarehouseNo: function (oItem) {
    var oCtx = oItem && oItem.getBindingContext && oItem.getBindingContext();
    if (!oCtx) {
        return "";
    }
    return oCtx.getProperty("WarehouseNo") || "";
},




_onCtrlIndicatorValueHelpRequest: function () {
    var oSFB = this.byId("smartFilterBar");
    var that = this;

    // Patch ValueHelpDialog.open ONCE, then restore (deterministic, no guessing)
    var VHD = sap.ui.comp.valuehelpdialog.ValueHelpDialog;
    var fnOrigOpen = VHD.prototype.open;

    VHD.prototype.open = function () {
        // Call original open
        fnOrigOpen.apply(this, arguments);

        try {
            // Identify the correct dialog by title used in your UI
            var sTitle = (this.getTitle && this.getTitle()) ? this.getTitle() : "";
            // Your dialog title shows "Proc.Type Det. Ind." in the screenshot
            if (sTitle.indexOf("Proc.Type Det. Ind.") === -1 && sTitle.indexOf("Proc.Type") === -1) {
                return;
            }

            //  Force SINGLE selection mode (removes checkboxes)
            this.setSupportMultiselect(false);
            this.setSupportRanges(false);
            this.setSupportRangesOnly(false);

            //  Hide Warehouse column in the result table (if present)
            var oTable = this.getTable && this.getTable();
            if (oTable && oTable.getColumns) {
                oTable.getColumns().forEach(function (oCol) {
                    var oLabel = oCol.getLabel && oCol.getLabel();
                    var sText = oLabel && oLabel.getText && oLabel.getText();
                    if (sText && sText.toLowerCase().indexOf("warehouse") !== -1) {
                        oCol.setVisible(false);
                    }
                });
            }

            //  When user presses OK, take the selected row and write back into SmartFilterBar
            // (SmartFilterBar filter fields are condition-based; setFilterData is the stable write-back)
            this.detachOk(that._bpVHOkHandler); // avoid duplicates
            that._bpVHOkHandler = function (oEvent) {
                // Prefer selected items (single-select => 1 item)
                var aTokens = oEvent.getParameter("tokens") || [];
                var sKey = aTokens.length ? aTokens[0].getKey() : "";

                if (sKey) {
                    // Write filter value back
                    oSFB.setFilterData(Object.assign({}, oSFB.getFilterData(), {
                        CtrlIndicatorProcessType: sKey
                    }));
                    oSFB.fireFilterChange(); // ensure UI updates
                }
            };

            this.attachOk(that._bpVHOkHandler);

        } finally {
            // Restore immediately so we don't affect other value helps
            VHD.prototype.open = fnOrigOpen;
        }
    };
},

_scheduleRowViewSetup: function () {
    setTimeout(function () {
        this._insertRowViewToggleIntoToolbar();

        var sMode = this.getView().getModel("viewModel").getProperty("/rowViewMode");
        if (sMode === "Compact") {
            this._applyCompactMode();
        } else {
            this._applyDetailedMode();
        }
    }.bind(this), 100);
},

_applyEntitledReadOnly: function () {

    // Only apply when SmartTable is in EDIT mode
    var oSmartTable = this.byId("LineItemsSmartTable");
    if (!oSmartTable || !oSmartTable.getEditable()) {
        return;
    }

    var oTable = this.byId("_IDGenTable");
    if (!oTable) {
        return;
    }

    var aColumns = oTable.getColumns();
    var iEntitledIndex = -1;

    // Find Entitled column index safely
    aColumns.some(function (oColumn, iIndex) {
        var vP13nData = oColumn.data("p13nData");
        var sLeadingProperty;

        if (typeof vP13nData === "string") {
            try {
                sLeadingProperty = JSON.parse(vP13nData).leadingProperty;
            } catch (e) {
                return false;
            }
        } else if (vP13nData && typeof vP13nData === "object") {
            sLeadingProperty = vP13nData.leadingProperty;
        }

        if (sLeadingProperty && sLeadingProperty.toLowerCase() === "entitled") {
            iEntitledIndex = iIndex;
            return true;
        }

        return false;
    });

    if (iEntitledIndex === -1) {
        return;
    }

    // Iterate ONLY table rows (avoid dialogs!)
    oTable.getItems().forEach(function (oItem) {

        if (!oItem.isA || !oItem.isA("sap.m.ColumnListItem")) {
            return;
        }

        var aCells = oItem.getCells();
        if (!aCells || aCells.length <= iEntitledIndex) {
            return;
        }

        var oCell = aCells[iEntitledIndex];
        if (!oCell) {
            return;
        }

        // direct SmartField
        if (oCell.isA && oCell.isA("sap.ui.comp.smartfield.SmartField")) {
            var oBinding = oCell.getBinding("value");
            if (!oBinding || oBinding.getPath() !== "Entitled") {
                return;
            }

            oCell.setEditable(false);
            return;
        }

        // nested SmartField inside wrappers
        if (oCell.findAggregatedObjects) {
            var aSmartFields = oCell.findAggregatedObjects(true, function (oControl) {
                return oControl.isA && oControl.isA("sap.ui.comp.smartfield.SmartField");
            });

            aSmartFields.forEach(function (oSmartField) {
                var oBinding = oSmartField.getBinding("value");
                if (!oBinding || oBinding.getPath() !== "Entitled") {
                    return;
                }

                oSmartField.setEditable(false);
            });
        }
    });
},


        // =========================================================
        // TABLE SELECTION
        // =========================================================

onTableSelectionChange: function () {

    var aSelectedItems = this.table ? this.table.getSelectedItems() : [];

    //  default = both buttons disabled
    var bCreate = false;
    var bMassChange = false;

    // No selection -> keep both disabled
    if (!aSelectedItems.length) {
        this.getView().byId("_IDGenButton").setEnabled(false);
        this.getView().byId("_MassChange").setEnabled(false);
        return;
    }

    var sWarehouse = aSelectedItems[0].getBindingContext().getObject().WarehouseNo || "";

    var bAllEmpty = true;
    var bAllExtended = true;
    var bAllSameWarehouse = true;

    aSelectedItems.forEach(function (oItem) {
        var oObj = oItem.getBindingContext().getObject();
        var sRowWarehouse = oObj.WarehouseNo || "";

        // for CREATE logic
        if (sRowWarehouse) {
            bAllEmpty = false;
        } else {
            bAllExtended = false;
        }

        // for MASS CHANGE logic
        if (sRowWarehouse !== sWarehouse) {
            bAllSameWarehouse = false;
        }
    });

    // ------------------------------------------------
    // CREATE
    // keep current business behavior you implemented:
    // enabled only when all selected rows are NOT extended
    // ------------------------------------------------
    if (bAllEmpty) {
        bCreate = true;
    }

    // ------------------------------------------------
    // MASS CHANGE
    // enabled only when:
    // - at least 2 rows are selected
    // - all are already extended
    // - all belong to the same warehouse
    // ------------------------------------------------
    if (aSelectedItems.length > 1 && bAllExtended && bAllSameWarehouse) {
        bMassChange = true;
    }

    // ------------------------------------------------
    // show message if multiple extended rows from different warehouses
    // ------------------------------------------------
    if (aSelectedItems.length > 1 && bAllExtended && !bAllSameWarehouse) {
        this.messageInformationDialog();
    }

    this.getView().byId("_IDGenButton").setEnabled(bCreate);
    this.getView().byId("_MassChange").setEnabled(bMassChange);
},




_isExistingWarehouseCombination: function (sMaterialId, sWarehouseNo, sEntitled) {
    var aItems = this.table ? this.table.getItems() : [];

    return aItems.some(function (oItem) {
        var oObj = oItem.getBindingContext().getObject();

        return oObj.MaterialId === sMaterialId &&
               oObj.WarehouseNo === sWarehouseNo &&
               oObj.Entitled === sEntitled;
    });
},


        // =========================================================
        // INFO DIALOG
        // =========================================================
        messageInformationDialog: function () {
            if (!this.oInfoMessageDialog) {
                this.oInfoMessageDialog = new sap.m.Dialog({
                    type: sap.m.DialogType.Message,
                    title: "Information",
                    state: sap.ui.core.ValueState.Information,
                    content: new sap.m.Text({
                        text: this.getView().getModel("i18n").getResourceBundle().getText("massChangeInfo")
                    }),
                    beginButton: new sap.m.Button({
                        type: sap.m.ButtonType.Emphasized,
                        text: "OK",
                        press: function () {
                            this.oInfoMessageDialog.close();
                        }.bind(this)
                    })
                });
            }

            this.oInfoMessageDialog.open();
        },

      onBeforeRebindTable: function (oEvent) {

    var oBindingParams = oEvent.getParameter("bindingParams");

    //  disable $skip cache behavior
    oBindingParams.parameters = oBindingParams.parameters || {};
    oBindingParams.parameters["$top"] = 1000;

    //  FORCE new request (important)
    oBindingParams.preventTableBind = false;
},

        // =========================================================
        // CREATE ASSIGNMENT
        // =========================================================
        
onCreate: function () {
    var that = this;

    if (!this.oDialog) {
        this.loadFragment({
            name: "bearingpoint.ewm.materialmaintenance.view.fragments.Create"
        }).then(function (oDialog) {

            //  Always recreate template fresh
            that.oContextNewEntry = that.createNewEntry();

            that.getView().byId("sfCreate").setBindingContext(that.oContextNewEntry);

            that.oDialog = oDialog;
            oDialog.open();
        });
    } else {

        //  recreate EVERY TIME dialog is opened
        this.oContextNewEntry = this.createNewEntry();

        this.getView().byId("sfCreate").setBindingContext(this.oContextNewEntry);

        this.oDialog.open();
    }
},


        onChangeWH: function () {
            var sWarehouseNo = this.getView().byId("warehouseNo").getValue();

            if (sWarehouseNo) {
                this.getView().getModel().setProperty("WarehouseNo", sWarehouseNo, this.oContextNewEntry);
                this.getView().byId("warehouseNo").setValueState(sap.ui.core.ValueState.None);
            }
        },

        onChangeEntitled: function () {
            var sEntitled = this.getView().byId("entitled").getValue();

            if (sEntitled) {
                this.getView().getModel().setProperty("Entitled", sEntitled, this.oContextNewEntry);
                this.getView().byId("entitled").setValueState(sap.ui.core.ValueState.None);
            }
        },


onCreateWarehouse: function () {
    var oModel = this.getView().getModel();
    var oSmartTable = this.getView().byId("LineItemsSmartTable");
    var aSelectedItems = this.table ? this.table.getSelectedItems() : [];

    
if (!this.oContextNewEntry) {
    console.log("Recreating missing template...");
    this.oContextNewEntry = this.createNewEntry();
}


    var oDialogObject = oModel.getProperty(this.oContextNewEntry.sPath);

    // --------------------------------------------
    // 1) Mandatory fields from dialog
    // --------------------------------------------
    if (!oDialogObject.WarehouseNo || this.getView().byId("warehouseNo").getValue() === "") {
        this.getView().byId("warehouseNo").setValueState(sap.ui.core.ValueState.Error);
        return;
    } else {
        this.getView().byId("warehouseNo").setValueState(sap.ui.core.ValueState.None);
    }

    if (!oDialogObject.Entitled || this.getView().byId("entitled").getValue() === "") {
        this.getView().byId("entitled").setValueState(sap.ui.core.ValueState.Error);
        return;
    } else {
        this.getView().byId("entitled").setValueState(sap.ui.core.ValueState.None);
    }

    // Quantity requires UoM
    if (
        this._hasMeaningfulMassChangeValue &&
        this._hasMeaningfulMassChangeValue(oDialogObject.RecommendedStorageQuantity, "RecommendedStorageQuantity") &&
        !this._hasMeaningfulMassChangeValue(oDialogObject.PrefferedAltUoMforWarehouseOp, "PrefferedAltUoMforWarehouseOp")
    ) {
        sap.m.MessageToast.show("Preferred UoM is required when Recommended Storage Quantity is filled.");
        return;
    }

    if (!aSelectedItems.length) {
        sap.m.MessageBox.error("No materials selected.");
        return;
    }

    // --------------------------------------------
    // 2) Keep dialog values before deleting temp row
    // --------------------------------------------
    var oTemplate = Object.assign({}, oDialogObject);

    // remove the temporary dialog entry so it does not get submitted as a single fake create
    this.deleteModelEntry(this.oContextNewEntry);
    this.oContextNewEntry = null;

    var iCreated = 0;
    var iSkipped = 0;

    // --------------------------------------------
    // 3) Create one real entry per selected row
    // --------------------------------------------
    aSelectedItems.forEach(function (oItem) {
        var oSource = oItem.getBindingContext().getObject();

if (this._isExistingWarehouseCombination(
    oSource.MaterialId,
    oTemplate.WarehouseNo,
    oTemplate.Entitled
)) {
    iSkipped++;
    return;
}

        oModel.createEntry("/ZEWM_C_MATERIAL", {
            properties: {
                // identity from selected source row
                MaterialId: oSource.MaterialId || "",
                MaterialNumber: oSource.MaterialNumber || "",
                MaterialDesc: oSource.MaterialDesc || "",

                // target combination from dialog
                WarehouseNo: oTemplate.WarehouseNo || "",
                Entitled: oTemplate.Entitled || "",

                // keep source GUIDs if present, else fallback zero GUID
               
EntitledId: oSource.EntitledId || "",
Scuguid: oSource.Scuguid || "",


                // values from dialog template (apply same entered values to all selected materials)
                PutawayControl: oTemplate.PutawayControl || "",
                StorSectInd: oTemplate.StorSectInd || "",
                StockRemovalCtrl: oTemplate.StockRemovalCtrl || "",
                BulkStorage: oTemplate.BulkStorage || "",

                ProcBlockProfile: oTemplate.ProcBlockProfile || "",
                CtrlIndicatorProcessType: oTemplate.CtrlIndicatorProcessType || "",
                ProductLoadCategory: oTemplate.ProductLoadCategory || "",
                CycleCountingIndicator: oTemplate.CycleCountingIndicator || "",

                MinShelfLife: oTemplate.MinShelfLife || 0,
                QuantityClassMerchandiseDistr: oTemplate.QuantityClassMerchandiseDistr || "",
                PrefferedAltUoMforWarehouseOp: oTemplate.PrefferedAltUoMforWarehouseOp || "",
                QualityInspectionGroup: oTemplate.QualityInspectionGroup || "",
                StorageBinType: oTemplate.StorageBinType || "",
                StockDeterminationGroup: oTemplate.StockDeterminationGroup || "",
                RelevanceForTwoStepPicking: oTemplate.RelevanceForTwoStepPicking || "",
                StagingAreaDoorDetGroup: oTemplate.StagingAreaDoorDetGroup || "",

                NumberOfSalesOrderItems: oTemplate.NumberOfSalesOrderItems || 0,
            
               

                DimentioRatio: oTemplate.DimentioRatio || 0,
                WeightIndicator: oTemplate.WeightIndicator || "",
                VolumeIndicator: oTemplate.VolumeIndicator || "",
                LengthIndicator: oTemplate.LengthIndicator || "",
                WidthIndicator: oTemplate.WidthIndicator || "",
                HeightIndicator: oTemplate.HeightIndicator || ""
            }
        });

        iCreated++;
    }.bind(this));

    // --------------------------------------------
    // 4) Nothing to create
    // --------------------------------------------
    if (iCreated === 0) {
        sap.m.MessageToast.show("All selected materials already exist for this Warehouse / Entitled combination.");
        oModel.refresh(true);
        return;
    }

    console.log("CREATE TEMPLATE =", oTemplate);
    console.log("Created entries =", iCreated, "Skipped duplicates =", iSkipped);
    console.log("Pending changes =", oModel.hasPendingChanges());
    // --------------------------------------------
    // 5) Submit all created entries
    // --------------------------------------------
    oModel.submitChanges({
        success: function (oResponse) {

            var bHasError = false;

            if (oResponse && oResponse.__batchResponses) {
                bHasError = oResponse.__batchResponses.some(function (oBatch) {
                    if (oBatch.__changeResponses) {
                        return oBatch.__changeResponses.some(function (oChange) {
                            return oChange.response && parseInt(oChange.response.statusCode, 10) >= 400;
                        });
                    }
                    return oBatch.response && parseInt(oBatch.response.statusCode, 10) >= 400;
                });
            }

            if (bHasError) {
                sap.m.MessageBox.error("Error creating warehouse assignment.");
                oModel.refresh(true);
                if (oSmartTable && oSmartTable.rebindTable) {
                    oSmartTable.rebindTable(true);
                }
                return;
            }

            if (this.oDialog) {
                this.oDialog.close();
            }

            if (iSkipped > 0) {
                sap.m.MessageToast.show(
                    "Warehouse assignments created: " + iCreated + ". Skipped existing combinations: " + iSkipped + "."
                );
            } else {
                sap.m.MessageToast.show("Warehouse assignments created successfully: " + iCreated);
            }

            oModel.refresh(true);

            if (oSmartTable && oSmartTable.rebindTable) {
                oSmartTable.rebindTable(true);
            }

            if (this.table) {
                this.table.removeSelections(true);
            }

            this.getView().byId("_IDGenButton").setEnabled(false);
            this.getView().byId("_MassChange").setEnabled(false);

        }.bind(this),

        error: function () {
            sap.m.MessageBox.error("Error creating warehouse assignment.");

            if (oModel.resetChanges) {
                oModel.resetChanges();
            }

            oModel.refresh(true);

            if (oSmartTable && oSmartTable.rebindTable) {
                oSmartTable.rebindTable(true);
            }
        }.bind(this)
    });
},


        closeCreateDialog: function () {
            var oModel = this.getView().getModel();

            if (this.oContextNewEntry) {
                this.deleteModelEntry(this.oContextNewEntry);
                this.oContextNewEntry = null;
            }

            if (this.oDialog) {
                this.oDialog.close();
            }

            oModel.refresh(true);
        },

        createNewEntry: function () {
            var aSelectedItems = this.table.getSelectedItems();
            var oFirstItemContext = aSelectedItems[0].getBindingContext();

            function val(v) {
                return v !== null && v !== undefined ? v : "";
            }

            var sMaterialId = oFirstItemContext.getProperty("MaterialId");
            var sMaterialNumber = oFirstItemContext.getProperty("MaterialNumber");
            var sMaterialDesc = oFirstItemContext.getProperty("MaterialDesc");

            var sWarehouseNo = oFirstItemContext.getProperty("WarehouseNo");
            var sEntitled = oFirstItemContext.getProperty("Entitled");
            var sEntitledId = oFirstItemContext.getProperty("EntitledId");
            var sScuguid = oFirstItemContext.getProperty("Scuguid");

            return this.getView().getModel().createEntry("/ZEWM_C_MATERIAL", {
                properties: {
                    MaterialId: val(sMaterialId),
                    MaterialNumber: val(sMaterialNumber),
                    MaterialDesc: val(sMaterialDesc),

                    WarehouseNo: val(sWarehouseNo),
                    Entitled: val(sEntitled),

                    EntitledId: sEntitledId || "00000000-0000-0000-0000-000000000000",
                    Scuguid: sScuguid || "00000000-0000-0000-0000-000000000000",

                    PutawayControl: val(oFirstItemContext.getProperty("PutawayControl")),
                    StorSectInd: val(oFirstItemContext.getProperty("StorSectInd")),
                    StockRemovalCtrl: val(oFirstItemContext.getProperty("StockRemovalCtrl")),
                    BulkStorage: val(oFirstItemContext.getProperty("BulkStorage")),

                    ProcBlockProfile: val(oFirstItemContext.getProperty("ProcBlockProfile")),
                    CtrlIndicatorProcessType: val(oFirstItemContext.getProperty("CtrlIndicatorProcessType")),
                    ProductLoadCategory: val(oFirstItemContext.getProperty("ProductLoadCategory")),
                    CycleCountingIndicator: val(oFirstItemContext.getProperty("CycleCountingIndicator")),
                    MinShelfLife: val(oFirstItemContext.getProperty("MinShelfLife")),
                    QuantityClassMerchandiseDistr: val(oFirstItemContext.getProperty("QuantityClassMerchandiseDistr")),
                    PrefferedAltUoMforWarehouseOp: val(oFirstItemContext.getProperty("PrefferedAltUoMforWarehouseOp")),
                    QualityInspectionGroup: val(oFirstItemContext.getProperty("QualityInspectionGroup")),
                    StorageBinType: val(oFirstItemContext.getProperty("StorageBinType")),
                    StockDeterminationGroup: val(oFirstItemContext.getProperty("StockDeterminationGroup")),
                    RelevanceForTwoStepPicking: val(oFirstItemContext.getProperty("RelevanceForTwoStepPicking")),
                    StagingAreaDoorDetGroup: val(oFirstItemContext.getProperty("StagingAreaDoorDetGroup")),
                    NumberOfSalesOrderItems: val(oFirstItemContext.getProperty("NumberOfSalesOrderItems")),
                    RecommendedStorageQuantity: val(oFirstItemContext.getProperty("RecommendedStorageQuantity")),
                    DimentioRatio: val(oFirstItemContext.getProperty("DimentioRatio")),
                    WeightIndicator: val(oFirstItemContext.getProperty("WeightIndicator")),
                    VolumeIndicator: val(oFirstItemContext.getProperty("VolumeIndicator")),
                    WidthIndicator: val(oFirstItemContext.getProperty("WidthIndicator")),
                    HeightIndicator: val(oFirstItemContext.getProperty("HeightIndicator")),
                    LengthIndicator: val(oFirstItemContext.getProperty("LengthIndicator")),
                }
            });
        },

        deleteModelEntry: function (oContext) {
            this.getView().getModel().deleteCreatedEntry(oContext);
        },

        // =========================================================
        // MASS CHANGE
        // =========================================================

        onMassChange: function () {
            var that = this;

            if (!this.oMassDialog) {
                this.loadFragment({
                    name: "bearingpoint.ewm.materialmaintenance.view.fragments.MassChange"
                }).then(function (oDialog) {
                    that.oMassDialog = oDialog;
                    that.oContextNewEntry = that._createMassChangeEntry();
                    that.getView().byId("SF1").setBindingContext(that.oContextNewEntry);
                    that.getView().byId("LineItemsSmartTable").setEditable(true);
                    that.onEditToggled();
                    oDialog.open();
                });
            } else {
                that.oContextNewEntry = that._createMassChangeEntry();
                that.getView().byId("SF1").setBindingContext(that.oContextNewEntry);
                this.getView().byId("LineItemsSmartTable").setEditable(true);
                that.onEditToggled();
                this.oMassDialog.open();
            }
        },


onMassFieldChange: function (oEvent) {
    var oSource = oEvent.getSource();
    var oBinding = oSource.getBinding("value");

    if (!oBinding || !this.oContextNewEntry) {
        return;
    }

    var sPath = oBinding.getPath();
    var oContext = oSource.getBindingContext();
    var vValue = oContext ? oContext.getProperty(sPath) : (oSource.getValue ? oSource.getValue() : null);

    this.getView().getModel().setProperty(sPath, vValue, this.oContextNewEntry);

    console.log("Mass Change field updated:", sPath, "=", vValue);
},



onCreateFieldChange: function (oEvent) {
    var oSource = oEvent.getSource();
    var oBinding = oSource.getBinding("value");

    if (!oBinding || !this.oContextNewEntry) {
        return;
    }

    var sPath = oBinding.getPath();
    var oContext = oSource.getBindingContext();
    var vValue = oContext ? oContext.getProperty(sPath) : (oSource.getValue ? oSource.getValue() : null);

    this.getView().getModel().setProperty(sPath, vValue, this.oContextNewEntry);

    console.log("Create field updated:", sPath, "=", vValue);
},


        _closeDialog: function () {
            var oModel = this.getView().getModel();

            if (this.oContextNewEntry) {
                this.deleteModelEntry(this.oContextNewEntry);
                this.oContextNewEntry = null;
            }

            if (this.oMassDialog) {
                this.oMassDialog.close();
            }

            oModel.refresh(true);
        },

        // Helper:
        // - empty/null/undefined => not filled
        // - for selected numeric defaulted fields, 0 / 0.000 / 0.00 => treat as not filled
        //   so they don't trigger UoM validation and don't overwrite rows accidentally
        _hasMeaningfulMassChangeValue: function (vValue, sField) {
            if (vValue === "" || vValue === null || vValue === undefined) {
                return false;
            }

            var aZeroAsEmptyFields = [
                "RecommendedStorageQuantity",
                "NumberOfSalesOrderItems",
                "DimentioRatio"
            ];

            if (aZeroAsEmptyFields.indexOf(sField) > -1) {
                var sNormalized = String(vValue).replace(",", ".");
                var nValue = parseFloat(sNormalized);

                if (!isNaN(nValue) && nValue === 0) {
                    return false;
                }
            }

            return true;
        },

        applyMassChange: function () {
            var oModel = this.getView().getModel();
            var aSelectedItems = this.table.getSelectedItems();
            var oDialogObject = oModel.getProperty(this.oContextNewEntry.sPath);

            // Qty requires UoM only if Qty is meaningfully filled (> 0)
            if (this._hasMeaningfulMassChangeValue(oDialogObject.RecommendedStorageQuantity, "RecommendedStorageQuantity") &&
                !this._hasMeaningfulMassChangeValue(oDialogObject.PrefferedAltUoMforWarehouseOp, "PrefferedAltUoMforWarehouseOp")) {
                sap.m.MessageToast.show("Preferred UoM is required when Recommended Storage Quantity is filled.");
                return;
            }

            var aMassChangeFields = [
                "PutawayControl",
                "StorSectInd",
                "StockRemovalCtrl",
                "BulkStorage",

                "ProcBlockProfile",
                "CtrlIndicatorProcessType",
                "ProductLoadCategory",
                "CycleCountingIndicator",
                "MinShelfLife",
                "QuantityClassMerchandiseDistr",
                "PrefferedAltUoMforWarehouseOp",
                "QualityInspectionGroup",
                "StorageBinType",
                "StockDeterminationGroup",
                "RelevanceForTwoStepPicking",
                "StagingAreaDoorDetGroup",
                "NumberOfSalesOrderItems",
                "RecommendedStorageQuantity",
                "DimentioRatio",
                "WeightIndicator",
                "VolumeIndicator",
                "WidthIndicator",
                "HeightIndicator"
            ];

            aSelectedItems.forEach(function (oItem) {
                var oContext = oItem.getBindingContext();

                aMassChangeFields.forEach(function (sField) {
                    if (this._hasMeaningfulMassChangeValue(oDialogObject[sField], sField)) {
                        oModel.setProperty(sField, oDialogObject[sField], oContext);
                    }
                }.bind(this));
            }.bind(this));

            this.deleteModelEntry(this.oContextNewEntry);
            this.oContextNewEntry = null;

            if (this.oMassDialog) {
                this.oMassDialog.close();
            }

            this.onSaveData();
            this._validateAllConfiguredVHFieldsBeforeSave();    

        },

        _createMassChangeEntry: function () {
            var oModel = this.getView().getModel();
            var aSelectedItems = this.table.getSelectedItems();
            var oFirstContext = aSelectedItems[0].getBindingContext();

            function getCommonValue(sField) {
                var vFirst = oFirstContext.getProperty(sField);
                var bAllSame = aSelectedItems.every(function (oItem) {
                    return oItem.getBindingContext().getProperty(sField) === vFirst;
                });
                return bAllSame ? vFirst : "";
            }

            return oModel.createEntry("/ZEWM_C_MATERIAL", {
                properties: {
                    MaterialId: oFirstContext.getProperty("MaterialId") || "",
                    MaterialNumber: oFirstContext.getProperty("MaterialNumber") || "",
                    MaterialDesc: oFirstContext.getProperty("MaterialDesc") || "",
                    WarehouseNo: oFirstContext.getProperty("WarehouseNo") || "",
                    Entitled: oFirstContext.getProperty("Entitled") || "",
                    EntitledId: oFirstContext.getProperty("EntitledId") || "00000000-0000-0000-0000-000000000000",
                    Scuguid: oFirstContext.getProperty("Scuguid") || "00000000-0000-0000-0000-000000000000",

                    PutawayControl: getCommonValue("PutawayControl"),
                    StorSectInd: getCommonValue("StorSectInd"),
                    StockRemovalCtrl: getCommonValue("StockRemovalCtrl"),
                    BulkStorage: getCommonValue("BulkStorage"),
                    ProcBlockProfile: getCommonValue("ProcBlockProfile"),
                    CtrlIndicatorProcessType: getCommonValue("CtrlIndicatorProcessType"),
                    ProductLoadCategory: getCommonValue("ProductLoadCategory"),
                    CycleCountingIndicator: getCommonValue("CycleCountingIndicator"),
                    MinShelfLife: getCommonValue("MinShelfLife"),
                    QuantityClassMerchandiseDistr: getCommonValue("QuantityClassMerchandiseDistr"),
                    PrefferedAltUoMforWarehouseOp: getCommonValue("PrefferedAltUoMforWarehouseOp"),
                    QualityInspectionGroup: getCommonValue("QualityInspectionGroup"),
                    StorageBinType: getCommonValue("StorageBinType"),
                    StockDeterminationGroup: getCommonValue("StockDeterminationGroup"),
                    RelevanceForTwoStepPicking: getCommonValue("RelevanceForTwoStepPicking"),
                    StagingAreaDoorDetGroup: getCommonValue("StagingAreaDoorDetGroup"),
                    NumberOfSalesOrderItems: getCommonValue("NumberOfSalesOrderItems"),
                    RecommendedStorageQuantity: getCommonValue("RecommendedStorageQuantity"),
                    DimentioRatio: getCommonValue("DimentioRatio"),
                    WeightIndicator: getCommonValue("WeightIndicator"),
                    VolumeIndicator: getCommonValue("VolumeIndicator"),
                    WidthIndicator: getCommonValue("WidthIndicator"),
                    HeightIndicator: getCommonValue("HeightIndicator")
                }
            });
        },

        // =========================================================
        // COMPACT / DETAILED TOGGLE
        // =========================================================
        _getCompactFields: function () {
            return [
                "WarehouseNo",
                "MaterialNumber",
                "MaterialDesc",
                "PutawayControl",
                "StorSectInd",
                "StockRemovalCtrl",
                "BulkStorage",
                "ProcBlockProfile",
                "CtrlIndicatorProcessType",
                "ProductLoadCategory",
                "CycleCountingIndicator",
                "MinShelfLife"
            ];
        },

        _getDetailedOnlyFields: function () {
            return [
              
"QuantityClassMerchandiseDistr",
        "PrefferedAltUoMforWarehouseOp",
        "QualityInspectionGroup",
        "StorageBinType",
        "StockDeterminationGroup",
        "RelevanceForTwoStepPicking",
        "StagingAreaDoorDetGroup",
        "NumberOfSalesOrderItems",
        "RecommendedStorageQuantity",
        "DimentioRatio",
        "WeightIndicator",
        "VolumeIndicator",
        "LengthIndicator",
        "WidthIndicator",
        "HeightIndicator"

            ];
        },

        _getColumnPropertyName: function (oColumn) {
            var oP13nData = oColumn.data("p13nData");

            if (typeof oP13nData === "string") {
                try {
                    oP13nData = JSON.parse(oP13nData);
                } catch (e) {
                    // ignore
                }
            }

            if (oP13nData) {
                if (oP13nData.leadingProperty) {
                    return oP13nData.leadingProperty;
                }
                if (oP13nData.columnKey) {
                    return oP13nData.columnKey;
                }
            }

            if (oColumn.getSortProperty && oColumn.getSortProperty()) {
                return oColumn.getSortProperty();
            }

            if (oColumn.getFilterProperty && oColumn.getFilterProperty()) {
                return oColumn.getFilterProperty();
            }

            var oHeader = oColumn.getHeader && oColumn.getHeader();
            if (oHeader && oHeader.getText) {
                return oHeader.getText();
            }

            return "";
        },

        _applyCompactMode: function () {
            var oSmartTable = this.getView().byId("LineItemsSmartTable");
            var oInnerTable = oSmartTable.getTable();

            if (!oInnerTable) {
                return;
            }

            var aCompactFields = this._getCompactFields();
            var aDetailedOnlyFields = this._getDetailedOnlyFields();

            oInnerTable.getColumns().forEach(function (oColumn) {
                var sProp = this._getColumnPropertyName(oColumn);

                if (aDetailedOnlyFields.indexOf(sProp) > -1) {
                    oColumn.setVisible(false);
                    return;
                }

                if (aCompactFields.indexOf(sProp) > -1) {
                    oColumn.setVisible(true);
                    return;
                }
            }.bind(this));

            oInnerTable.invalidate();
        },

_applyDetailedMode: function () {
    var oSmartTable = this.getView().byId("LineItemsSmartTable");
    var oInnerTable = oSmartTable.getTable();

    if (!oInnerTable) {
        return;
    }

    var aCompactFields = this._getCompactFields();
    var aDetailedOnlyFields = this._getDetailedOnlyFields();

    oInnerTable.getColumns().forEach(function (oColumn) {
        var sProp = this._getColumnPropertyName(oColumn);

        // Show detailed-only fields again in Detailed mode
        if (aDetailedOnlyFields.indexOf(sProp) > -1) {
            oColumn.setVisible(true);
            return;
        }

        // Keep compact/core fields visible
        if (aCompactFields.indexOf(sProp) > -1) {
            oColumn.setVisible(true);
            return;
        }
    }.bind(this));

    oInnerTable.invalidate();
},


        _createRowViewToggle: function () {
            return new sap.m.SegmentedButton(this.createId("rowViewToggle"), {
                selectedKey: "Detailed",
                selectionChange: this.onToggleRowView.bind(this),
                width: "4.5rem",
                items: [
                    new sap.m.SegmentedButtonItem(this.createId("rowViewCompactItem"), {
                        key: "Compact",
                        icon: "sap-icon://list",
                        tooltip: "Compact"
                    }),
                    new sap.m.SegmentedButtonItem(this.createId("rowViewDetailedItem"), {
                        key: "Detailed",
                        icon: "sap-icon://detail-view",
                        tooltip: "Detailed"
                    })
                ]
            }).addStyleClass("sapUiTinyMarginBegin sapUiTinyMarginEnd");
        },

      
_insertRowViewToggleIntoToolbar: function () {
    var oSmartTable = this.getView().byId("LineItemsSmartTable");
    var oToolbar = oSmartTable && oSmartTable.getToolbar ? oSmartTable.getToolbar() : null;

    if (!oToolbar) {
        return;
    }

    var aContent = oToolbar.getContent();
    var oToggle = this.byId("rowViewToggle");

    // If toggle already exists but is not in the current toolbar, reinsert it
    if (oToggle) {
        var bAlreadyInToolbar = aContent.indexOf(oToggle) > -1;
        if (bAlreadyInToolbar) {
            return;
        }

        // If it belongs to another parent toolbar/content aggregation, remove it first
        var oOldParent = oToggle.getParent && oToggle.getParent();
        if (oOldParent && oOldParent !== oToolbar && oOldParent.removeContent) {
            oOldParent.removeContent(oToggle);
        }
    } else {
        oToggle = this._createRowViewToggle();
    }

    // Refresh content reference after possible parent changes
    aContent = oToolbar.getContent();

    var iEditIndex = -1;
    var iSettingsIndex = -1;

    aContent.forEach(function (oControl, iIndex) {
        try {
            var sIcon = oControl.getIcon && oControl.getIcon();

            if (sIcon === "sap-icon://edit" || sIcon === "sap-icon://save") {
                iEditIndex = iIndex;
            }

            if (sIcon === "sap-icon://action-settings" || sIcon === "sap-icon://settings") {
                iSettingsIndex = iIndex;
            }
        } catch (e) {
            // ignore controls without getIcon()
        }
    });

    // Best placement: between edit/save and settings
    if (iEditIndex > -1 && iSettingsIndex > -1 && iSettingsIndex > iEditIndex) {
        oToolbar.insertContent(oToggle, iEditIndex + 1);
    } else if (iEditIndex > -1) {
        oToolbar.insertContent(oToggle, iEditIndex + 1);
    } else if (iSettingsIndex > -1) {
        oToolbar.insertContent(oToggle, iSettingsIndex);
    } else {
        // fallback: add to end
        oToolbar.addContent(oToggle);
    }
},

   
onToggleRowView: function (oEvent) {
    var sKey = oEvent.getParameter("key");
    if (!sKey) {
        var oItem = oEvent.getParameter("item");
        sKey = oItem && oItem.getKey ? oItem.getKey() : "Detailed";
    }

    this.getView().getModel("viewModel").setProperty("/rowViewMode", sKey);

    if (sKey === "Compact") {
        this._applyCompactMode();
    } else {
        this._applyDetailedMode();
    }

    console.log("Row view mode switched to =", sKey);
},


        // =========================================================
        // EDIT / SAVE
        // =========================================================

onEditToggled: function () {

    var oSmartTable = this.getView().byId("LineItemsSmartTable");
    var aToolbarContent = oSmartTable.getToolbar().getContent();

    function isEditButton(oElement) {
        try {
            return oElement.getProperty("accesskey") === "d";
        } catch (e) {
            return false;
        }
    }

    var oEditToggleBtn = aToolbarContent.find(isEditButton);

    if (oSmartTable.getEditable()) {

        // 👉 entering edit mode
        if (oEditToggleBtn) {
            oEditToggleBtn.setIcon("sap-icon://save");
        }

        setTimeout(function () {
            this._applyEntitledReadOnly();
        }.bind(this), 200);

    } else {

        // 👉 leaving edit mode → SAVE

        if (oEditToggleBtn) {
            oEditToggleBtn.setIcon("sap-icon://edit");
        }

        //  IMPORTANT: delay save to allow model update
        setTimeout(function () {

            
this.onSaveData().then(function (bSuccess) {

    if (bSuccess) {
        //  exit edit mode properly
        oSmartTable.setEditable(false);

        if (oEditToggleBtn) {
            oEditToggleBtn.setIcon("sap-icon://edit");
        }
    } else {
        // ❗ stay in edit mode
        oSmartTable.setEditable(true);

        if (oEditToggleBtn) {
            oEditToggleBtn.setIcon("sap-icon://save");
        }
    }

}.bind(this));


        }.bind(this), 300); 

    }
},


    });
});
