

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog"
], function (Controller, JSONModel, ValueHelpDialog) {

    "use strict";

    return Controller.extend("bearingpoint.ewm.materialmaintenance.controller.Materials", {


  

onInit: function () {
    var oView = this.getView();
    var oSmartTable = oView.byId("LineItemsSmartTable");
    var oSmartFilterBar = oView.byId("smartFilterBar");

    // ===============================
    // View model
    // ===============================
    var oViewModel = new JSONModel({
        rowViewMode: "Detailed"
    });
    oView.setModel(oViewModel, "viewModel");

    
 // ===============================
    // SmartTable init (CLEAN)
    // ===============================
    oSmartTable.attachInitialise(function () {

        var oTable = oSmartTable.getTable();
        this.table = oTable;

        if (oTable) {

            // ✅ ALWAYS force MultiSelect for main table
            if (oTable.isA("sap.m.Table")) {
                oTable.setMode("MultiSelect");
            }

            oTable.attachSelectionChange(this.onTableSelectionChange.bind(this));

            if (oTable.attachUpdateFinished) {
                oTable.attachUpdateFinished(function () {
                    this._scheduleRowViewSetup();
                }.bind(this));
            }
        }

        this._scheduleRowViewSetup();

    }.bind(this));

    // ===============================
    // Page navigation hook
    // ===============================
    oView.addEventDelegate({
        onAfterShow: function () {
            this._scheduleRowViewSetup();
        }.bind(this)
    });


// ===============================
// ✅ ValueHelpDialog patch (FINAL - MultiSelect + hide Warehouse)
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

                // ✅ ensure this is ValueHelpDialog
                if (!oDialog || !oDialog.isA("sap.ui.comp.valuehelpdialog.ValueHelpDialog")) {
                    return;
                }

                var oTable = oDialog.getTable && oDialog.getTable();
                if (!oTable) return;

                // ✅ KEEP MULTISELECT (checkboxes)
                if (oTable.isA("sap.m.Table")) {
                    oTable.setMode("MultiSelect");
                }

                // ✅ robust hide logic
                var fnHideLgnum = function () {

                    var aCols = oTable.getColumns() || [];
                    var aItems = oTable.getItems() || [];

                    // ✅ fallback if no data yet
                    if (aItems.length === 0) {
                        aCols.forEach(function (oCol) {
                            var sHeader = oCol.getHeader && oCol.getHeader().getText();
                            if (sHeader && sHeader.toLowerCase().includes("warehouse")) {
                                oCol.setVisible(false);
                            }
                        });
                        return;
                    }

                    var aCells = aItems[0].getCells();

                    aCols.forEach(function (oCol, i) {

                        if (!aCells[i]) return;

                        var oBinding = aCells[i].getBinding && aCells[i].getBinding("text");
                        var sPath = oBinding && oBinding.getPath && oBinding.getPath();

                        // ✅ flexible detection
                        if (sPath && sPath.toLowerCase().includes("lgnum")) {
                            oCol.setVisible(false);
                        }
                    });
                };

                // ✅ initial hide
                fnHideLgnum();

                // ✅ reapply AFTER every refresh (CRITICAL)
                if (oTable.attachUpdateFinished) {
                    oTable.detachUpdateFinished(oDialog._vhHideHandler);
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

            // ✅ Force SINGLE selection mode (removes checkboxes)
            this.setSupportMultiselect(false);
            this.setSupportRanges(false);
            this.setSupportRangesOnly(false);

            // ✅ Hide Warehouse column in the result table (if present)
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

            // ✅ When user presses OK, take the selected row and write back into SmartFilterBar
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



        // =========================================================
        // TABLE SELECTION
        // =========================================================
   onTableSelectionChange: function () {
    var aSelectedItems = this.table ? this.table.getSelectedItems() : [],
        bMassChange = true,
        that = this;

    // ---------------------------------------------------------
    // CREATE
    // Safe first rule:
    // Enable Create when exactly ONE row is selected,
    // regardless of whether WarehouseNo is blank or filled.
    // This allows:
    // - creating first warehouse assignment
    // - creating additional warehouse/entitled combinations
    // ---------------------------------------------------------
    var bCreate = (aSelectedItems.length === 1);

    // ---------------------------------------------------------
    // MASS CHANGE
    // Only for same warehouse and more than one row
    // ---------------------------------------------------------
    if (aSelectedItems.length > 0) {
        var sPrevWarehouse = aSelectedItems[0].getBindingContext().getObject().WarehouseNo;

        aSelectedItems.forEach(function (oItem) {
            var oObj = oItem.getBindingContext().getObject();

            if (oObj.WarehouseNo !== "" && oObj.WarehouseNo !== sPrevWarehouse) {
                bMassChange = false;
                that.messageInformationDialog();
            }
        });
    }

    this.getView().byId("_IDGenButton").setEnabled(bCreate);
    this.getView().byId("_MassChange").setEnabled(aSelectedItems.length > 1 && bMassChange === true);
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

        // =========================================================
        // SMARTTABLE BINDING
        // =========================================================
        onBeforeRebindTable: function () {
            // Keep minimal and stable.
            // requestAtLeastFields is handled in XML.
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
                    that.oContextNewEntry = that.createNewEntry();
                    that.getView().byId("sfCreate").setBindingContext(that.oContextNewEntry);
                    that.oDialog = oDialog;
                    oDialog.open();
                });
            } else {
                that.oContextNewEntry = that.createNewEntry();
                that.getView().byId("sfCreate").setBindingContext(that.oContextNewEntry);
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
    var oDialogObject = oModel.getProperty(this.oContextNewEntry.sPath);
    var oSmartTable = this.getView().byId("LineItemsSmartTable");

    if (!oDialogObject.WarehouseNo || this.getView().byId("warehouseNo").getValue() === "") {
        this.getView().byId("warehouseNo").setValueState(sap.ui.core.ValueState.Error);
        return;
    }

    if (!oDialogObject.Entitled || this.getView().byId("entitled").getValue() === "") {
        this.getView().byId("entitled").setValueState(sap.ui.core.ValueState.Error);
        return;
    }

    // Quantity requires UoM
    if (this._hasMeaningfulMassChangeValue &&
        this._hasMeaningfulMassChangeValue(oDialogObject.RecommendedStorageQuantity, "RecommendedStorageQuantity") &&
        !this._hasMeaningfulMassChangeValue(oDialogObject.PrefferedAltUoMforWarehouseOp, "PrefferedAltUoMforWarehouseOp")) {
        sap.m.MessageToast.show("Preferred UoM is required when Recommended Storage Quantity is filled.");
        return;
    }

    // Duplicate check: do not create if combination already exists
    if (this._isExistingWarehouseCombination(
        oDialogObject.MaterialId,
        oDialogObject.WarehouseNo,
        oDialogObject.Entitled
    )) {
        sap.m.MessageToast.show("This Warehouse / Entitled combination already exists for the selected material.");
        return;
    }

    console.log("FINAL CREATE PAYLOAD =", oModel.getProperty(this.oContextNewEntry.sPath));

    oModel.submitChanges({
        success: function () {
            sap.m.MessageToast.show("Warehouse assignment created successfully");

            if (this.oDialog) {
                this.oDialog.close();
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
            this.oContextNewEntry = null;
        }.bind(this),

        error: function () {
            sap.m.MessageToast.show("Error creating warehouse assignment");

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
                    HeightIndicator: val(oFirstItemContext.getProperty("HeightIndicator"))
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
                if (oEditToggleBtn) {
                    oEditToggleBtn.setIcon("sap-icon://save");
                }
            } else {
                if (oEditToggleBtn) {
                    oEditToggleBtn.setIcon("sap-icon://edit");
                }
                this.onSaveData();
            }
        },

        onSaveData: function () {
            var oModel = this.getView().getModel();
            var oSmartTable = this.getView().byId("LineItemsSmartTable");

            if (oModel.hasPendingChanges()) {
                oModel.submitChanges({
                    success: function () {
                        sap.m.MessageToast.show(
                            this.getView().getModel("i18n").getResourceBundle().getText("saveSuccessMessage")
                        );

                        oModel.refresh(true);

                        if (oSmartTable && oSmartTable.rebindTable) {
                            oSmartTable.rebindTable(true);
                        }

                        this._scheduleRowViewSetup();
                    }.bind(this),

                    error: function () {
                        sap.m.MessageToast.show(
                            this.getView().getModel("i18n").getResourceBundle().getText("saveErrorMessage")
                        );

                        if (oModel.resetChanges) {
                            oModel.resetChanges();
                        }

                        oModel.refresh(true);

                        if (oSmartTable && oSmartTable.rebindTable) {
                            oSmartTable.rebindTable(true);
                        }

                        this._scheduleRowViewSetup();
                    }.bind(this)
                });
            }
        }
    });
});
