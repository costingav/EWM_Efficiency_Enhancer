

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog"
], function (Controller, JSONModel, ValueHelpDialog) {

    "use strict";

    return Controller.extend("bearingpoint.ewm.materialmaintenance.controller.Materials", {

    _dialogMode: null,
    _extendSourceWarehouse: null,
    _extendSourceMaterial: null,
    _extendSourceMaterialDesc: null,

onInit: function () {
    var oView = this.getView();
    var oController = this;
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

                // check invalid length (generic safety)
                if (sValue && sValue.length > 4) {
                    oControl.setValue("");
                    oControl.setSelectedKey && oControl.setSelectedKey("");

                    aInvalidFields.push(oItem.getLabel());
                }

            });

            // User feedback (clean UX)
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
        this.getView().byId("_ExtendButton")?.setEnabled(false);

        if (oTable) {

            if (oTable.isA("sap.m.Table")) {
                oTable.setMode("MultiSelect");
            }

            oTable.attachSelectionChange(this.onTableSelectionChange.bind(this));

            if (oTable.attachUpdateFinished) {
                
oTable.attachUpdateFinished(function () {

    this._scheduleRowViewSetup();

    //  Delay once to allow SmartFields to fully render
    

setTimeout(function () {
    this._wireGenericVHValidation();
    this._wireNumericValidation();
}.bind(this), 600);



    this._forceAllColumnsVisible();
    this._forceSelectAllColumnsInPerso();

    setTimeout(function () {
        this._applyEntitledReadOnly();
    }.bind(this), 200);

}.bind(this));
            }
        }

        this._scheduleRowViewSetup();

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

       
setTimeout(function () {
    this._wireGenericVHValidation();
    this._wireNumericValidation();
}.bind(this), 600);


        setTimeout(function () {
            this._applyEntitledReadOnly();
        }.bind(this), 200);

    }.bind(this)
});


    // ===============================
    // ValueHelpDialog patch
    // ===============================
    if (oSmartFilterBar && !this._vhPatched) {
        this._vhPatched = true;

        var fnOrigAfterRendering = ValueHelpDialog.prototype.onAfterRendering;

        ValueHelpDialog.prototype.onAfterRendering = function () {

            if (fnOrigAfterRendering) {
                fnOrigAfterRendering.apply(this, arguments);
            }

            var oDialog = this;


var isFilterBarContext = function () {

    // SmartFilterBar dialogs usually have filter bar attached
    var oFilterBar = oDialog.getFilterBar && oDialog.getFilterBar();

    return !!oFilterBar;
};

            setTimeout(function () {
                try {
                    if (!oDialog || !oDialog.isA("sap.ui.comp.valuehelpdialog.ValueHelpDialog")) {
                        return;
                    }

                    var oTable = oDialog.getTable && oDialog.getTable();
                    if (!oTable) {
                        return;
                    }

                  
var fnApplyWarehouseFilter = function () {

    var oBinding = oTable.getBinding("items") || oTable.getBinding("rows");
    if (!oBinding) {
        return;
    }

    var sTitle = oDialog.getTitle && oDialog.getTitle();


if (sTitle && sTitle.toLowerCase().includes("warehouse")) {
        console.log("Skip filtering Warehouse VH");
        oBinding.filter([]);
        return;
    }

    

var sWarehouseNo = "";

// 1) Create / Extend dialog warehouse input has priority

var oWarehouseDialogInput = null;

if (oController.oDialog && oController.oDialog.isOpen && oController.oDialog.isOpen()) {
    oWarehouseDialogInput =
        sap.ui.getCore().byId(oController.oDialog.getId() + "--warehouseNo") ||
        sap.ui.getCore().byId("warehouseNo");
}

if (oWarehouseDialogInput && oWarehouseDialogInput.getValue) {
    sWarehouseNo = oWarehouseDialogInput.getValue() || "";
}


// 2) Inline edit / row VH must use the row that opened the VH
if (!sWarehouseNo && oController._lastVhContext && oController._lastVhContext.warehouseNo) {
    sWarehouseNo = oController._lastVhContext.warehouseNo;
}
console.log("LAST VH CONTEXT USED:", oController._lastVhContext);


// 3) Mass Change fallback → use selected rows warehouse
if (!sWarehouseNo && oController.oMassDialog && oController.oMassDialog.isOpen && oController.oMassDialog.isOpen()) {

    var oMainTable = oController.byId("_IDGenTable");

    if (oMainTable && oMainTable.getSelectedItems) {

        var aSelected = oMainTable.getSelectedItems();

        if (aSelected.length > 0) {

            var oCtx = aSelected[0].getBindingContext();

            if (oCtx) {
                sWarehouseNo = oCtx.getProperty("WarehouseNo") || "";
            }
        }
    }
}

    console.log("VH FILTER WarehouseNo =", sWarehouseNo, "Dialog title =", sTitle);

    // Default to Lgnum for most warehouse-dependent VH entities
   
var sWarehouseField = "Lgnum";

// These known VHs use WarehouseNo instead

if (sTitle && (
    sTitle.indexOf("Storage Bin") !== -1 ||
    sTitle.indexOf("Proc.Type Det.") !== -1 ||
    sTitle.indexOf("Process Block") !== -1 ||
    sTitle.indexOf("Prod. Load") !== -1 ||
    sTitle.indexOf("Stk Determin.") !== -1 ||
    sTitle.indexOf("Cyc. Coun.") !== -1 ||
    sTitle.indexOf("StagArea") !== -1 ||
    sTitle.indexOf("DoorDet") !== -1
)) {
    sWarehouseField = "WarehouseNo";
}



if (sTitle && sTitle.indexOf("Default Pty") !== -1) {
    sWarehouseField = "Lgnum";
}


    if (sWarehouseNo) {
        oBinding.filter([
            new sap.ui.model.Filter(
                sWarehouseField,
                sap.ui.model.FilterOperator.EQ,
                sWarehouseNo
            )
        ]);
    } else {
        oBinding.filter([]);
    }

};
         
var fnHideWarehouseColumn = function () {

    var sTitle = oDialog.getTitle && oDialog.getTitle();

    
// 1. Do NOT hide for Warehouse VH itself
if (sTitle && sTitle.toLowerCase().includes("warehouse")) {
    return;
}

// 2. Do NOT hide when opened from SmartFilterBar (global filtering)
if (isFilterBarContext()) {
    return;
}


    var aCols = oTable.getColumns ? oTable.getColumns() : [];
    var aRows = oTable.getItems
        ? oTable.getItems()
        : (oTable.getRows ? oTable.getRows() : []);

    aCols.forEach(function (oCol, iIndex) {

        var bHide = false;

        // 1) Header / label text check
        var oHeader = oCol.getHeader && oCol.getHeader();
        var oLabel = oCol.getLabel && oCol.getLabel();

        var sHeaderText =
            (oHeader && oHeader.getText && oHeader.getText()) ||
            (oLabel && oLabel.getText && oLabel.getText()) ||
            "";

        if (
            sHeaderText &&
            (
                sHeaderText.toLowerCase().includes("warehouse") ||
                sHeaderText.toLowerCase().includes("lgnum")
            )
        ) {
            bHide = true;
        }

        // 2) Column personalization / metadata check
        var vP13nData = oCol.data && oCol.data("p13nData");
        var sP13nData = "";

        if (typeof vP13nData === "string") {
            sP13nData = vP13nData;
        } else if (vP13nData) {
            try {
                sP13nData = JSON.stringify(vP13nData);
            } catch (e) {
                sP13nData = "";
            }
        }

        if (
            sP13nData &&
            (
                sP13nData.indexOf("WarehouseNo") !== -1 ||
                sP13nData.indexOf("Lgnum") !== -1 ||
                sP13nData.indexOf("LGNUM") !== -1
            )
        ) {
            bHide = true;
        }

        // 3) Cell binding check
        if (!bHide && aRows.length) {
            var aCells = aRows[0].getCells ? aRows[0].getCells() : [];
            var oCell = aCells[iIndex];

            if (oCell && oCell.getBinding) {
                var oTextBinding = oCell.getBinding("text");
                var oValueBinding = oCell.getBinding("value");

                var sTextPath = oTextBinding && oTextBinding.getPath && oTextBinding.getPath();
                var sValuePath = oValueBinding && oValueBinding.getPath && oValueBinding.getPath();

                var sPath = (sTextPath || sValuePath || "").toLowerCase();

                if (
                    sPath.includes("warehouseno") ||
                    sPath.includes("lgnum")
                ) {
                    bHide = true;
                }
            }
        }

        if (bHide && oCol.setVisible) {
            oCol.setVisible(false);
        }
    });
};


                    fnApplyWarehouseFilter();
                    fnHideWarehouseColumn();

                    if (oTable.attachUpdateFinished) {
                        if (oDialog._vhUpdateHandler) {
                            oTable.detachUpdateFinished(oDialog._vhUpdateHandler);
                        }

                        oDialog._vhUpdateHandler = function () {
                            fnApplyWarehouseFilter();
                            fnHideWarehouseColumn();
                        };

                        oTable.attachUpdateFinished(oDialog._vhUpdateHandler);
                    }

                } catch (e) {
                    console.log("VH patch error:", e);
                }
            }, 300);
        };
    

}

},


_canExtendSelection: function (aSelectedItems) {

    if (!aSelectedItems || aSelectedItems.length < 1 || aSelectedItems.length > 2) {
        return false;
    }

    var sWarehouse = null;

    for (var i = 0; i < aSelectedItems.length; i++) {

        var oObj = aSelectedItems[i].getBindingContext().getObject();

        if (!oObj || !oObj.MaterialId || !oObj.WarehouseNo) {
            return false;
        }

        if (sWarehouse === null) {
            sWarehouse = oObj.WarehouseNo;
        } else if (oObj.WarehouseNo !== sWarehouse) {
            return false;
        }
    }

    return true;
},


_canMassChangeSelection: function (aSelectedItems) {

    if (!aSelectedItems || aSelectedItems.length < 2) {
        return false;
    }

    var sWarehouse = null;

    for (var i = 0; i < aSelectedItems.length; i++) {

        var oObj = aSelectedItems[i].getBindingContext().getObject();

        if (!oObj || !oObj.WarehouseNo) {
            return false;
        }

        if (sWarehouse === null) {
            sWarehouse = oObj.WarehouseNo;
        } else if (oObj.WarehouseNo !== sWarehouse) {
            return false;
        }
    }

    return true;
},

_forceSelectAllColumnsInPerso: function () {
    var oSmartTable = this.byId("LineItemsSmartTable");
    var oPersController = oSmartTable && oSmartTable._oPersController;

    if (!oPersController ||
        typeof oPersController.getCurrentState !== "function" ||
        typeof oPersController.setCurrentState !== "function") {
        return;
    }

    var oState = oPersController.getCurrentState();

    if (!oState || !oState.columns) {
        return;
    }

    oState.columns.forEach(function (oCol) {
        oCol.visible = true;
    });

    oPersController.setCurrentState(oState);
},



_getVhValidationConfig: function () {
    return [
{
    fieldPath: "StagingAreaDoorDetGroup",
    headerText: "StagArea/DoorDet Grp",
    entitySet: "/ZEWM_I_DRDETGRVH",
    valueFieldCandidates: [
        "StagingAreaDoorDetGroup",
        "Drdetgr",
        "DRDETGR"
    ],
    message: "Invalid Door Determination Group for this Warehouse. Use Value Help."
},


        {
            fieldPath: "StorageBinType",
            headerText: "Storage Bin",
            entitySet: "/ZEWM_I_LPTYPVH",
            valueFieldCandidates: ["StorageBinType", "Lptyp"],
            message: "Invalid Storage Bin Type for this Warehouse. Use Value Help."
        },
        {
            fieldPath: "CtrlIndicatorProcessType",
            headerText: "Proc.Type Det.",
            entitySet: "/ZEWM_I_PTDETINDVH",
            valueFieldCandidates: ["CtrlIndicatorProcessType", "Ptdetind"],
            message: "Invalid Proc.Type Det. Ind. Use Value Help."
        },
        {
            fieldPath: "ProductLoadCategory",
            headerText: "Prod. Load",
            entitySet: "/ZEWM_I_WRKLDGRVH",
            valueFieldCandidates: ["ProductLoadCategory", "Wrkldgr"],
            message: "Invalid Product Load Category. Use Value Help."
        },
       

{
    fieldPath: "BulkStorage",
    headerText: "Bulk Storage",
    entitySet: "/ZEWM_I_BULKSTORAGEVH",

    //  Bulk Storage VH uses warehouse-specific customizing
    warehouseField: "Lgnum",

    //  Put likely technical key fields first
    valueField: "Block",
    valueFieldCandidates: [
        "Block",
        "BLOCK",
        "BulkStorage",
        "BulkSt",
        "Bulkst",
        "BULKST"
    ],

    message: "Invalid Bulk Storage. Use Value Help."
}

,
        {
            fieldPath: "PutawayControl",
            headerText: "Putaway Control",
            entitySet: "/ZEWM_I_PUTAWAYVH",
            valueFieldCandidates: ["PutawayControl", "PutStra"],
            message: "Invalid Putaway Control. Use Value Help."
        },
        {
            fieldPath: "StorSectInd",
            headerText: "Storage Sect",
            entitySet: "/ZEWM_I_STORAGESECTIONVH",
            valueFieldCandidates: ["StorSectInd", "LGBKZ"],
            message: "Invalid Storage Section Indicator. Use Value Help."
        },
        {
            fieldPath: "StockRemovalCtrl",
            headerText: "Stock Removal",
            entitySet: "/ZEWM_I_STOCKREMOVALVH",
            valueFieldCandidates: ["StockRemovalCtrl", "REM_STRA"],
            message: "Invalid Stock Removal Control. Use Value Help."
        },
        {
            fieldPath: "StockDeterminationGroup",
            headerText: "Stk Det. Group",
            entitySet: "/ZEWM_I_STCKDETGRVH",
            valueFieldCandidates: ["StockDeterminationGroup", "Stckdetgr"],
            message: "Invalid Stock Determination Group. Use Value Help."
        },
        {
            fieldPath: "QualityInspectionGroup",
            headerText: "Quality Insp.",
            entitySet: "/ZEWM_I_QGRPVH",
            valueFieldCandidates: ["QualityInspectionGroup", "QgrpWh"],
            message: "Invalid Quality Inspection Group. Use Value Help."
        },
        {
            fieldPath: "CycleCountingIndicator",
            headerText: "Cyc.Count Ind.",
            entitySet: "/ZEWM_I_CCINDVH",
            valueFieldCandidates: ["CycleCountingIndicator", "CCIND"],
            message: "Invalid Cycle Counting Indicator. Use Value Help."
        },
        {
            fieldPath: "QuantityClassMerchandiseDistr",
            headerText: "Quant Class.",
            entitySet: "/ZEWM_I_QUANCLAVH",
            valueFieldCandidates: ["QuantityClassMerchandiseDistr", "QuanclaMerch"],
            message: "Invalid Quantity Classification. Use Value Help."
        },
        {
            fieldPath: "ProcBlockProfile",
            headerText: "Process Block",
            entitySet: "/ZEWM_I_PROCPRFLVH",
            valueFieldCandidates: ["ProcBlockProfile", "Procprfl"],
            message: "Invalid Process Block Profile. Use Value Help."
        },
        {
            fieldPath: "WeightIndicator",
            headerText: "Weight Indicator",
            warehouseField: "Lgnum",
            entitySet: "/ZEWM_I_WEIGHTINDVH",
            valueFieldCandidates: ["WeightIndicator", "Dimind"],
            message: "Invalid Weight Indicator. Use Value Help."
        },
        {
            fieldPath: "VolumeIndicator",
            headerText: "Volume Indicator",
            warehouseField: "Lgnum",
            entitySet: "/ZEWM_I_VOLUMEINDVH",
            valueFieldCandidates: ["VolumeIndicator", "Dimind"],
            message: "Invalid Volume Indicator. Use Value Help."
        },
       
{
    fieldPath: "LengthIndicator",
    headerText: "Length Indicator",
    entitySet: "/ZEWM_I_LENGTHINDVH",
    warehouseField: "Lgnum",
    valueField: "LengthIndicator",
    valueFieldCandidates: ["LengthIndicator", "Dimind"],
    message: "Invalid Length Indicator. Use Value Help."
}

,
        {
            fieldPath: "WidthIndicator",
            headerText: "Width Indicator",
            warehouseField: "Lgnum",
            entitySet: "/ZEWM_I_WIDTHINDVH",
            valueFieldCandidates: ["WidthIndicator", "Dimind"],
            message: "Invalid Width Indicator. Use Value Help."
        },
        {
            fieldPath: "HeightIndicator",
            headerText: "Height Indicator",
            warehouseField: "Lgnum",
            entitySet: "/ZEWM_I_HEIGHTINDVH",
            valueFieldCandidates: ["HeightIndicator", "Dimind"],
            message: "Invalid Height Indicator. Use Value Help."
        }
    ];
},

_getVhEntityMeta: function (sEntitySet) {
    var oModel = this.getView().getModel();
    var oMetaModel = oModel && oModel.getMetaModel && oModel.getMetaModel();

    if (!oMetaModel || !sEntitySet) {
        return null;
    }

    var sSetName = sEntitySet.replace(/^\//, "");
    var oEntitySet = oMetaModel.getODataEntitySet(sSetName);

    if (!oEntitySet || !oEntitySet.entityType) {
        console.log("VH metadata not found for entity set:", sEntitySet);
        return null;
    }

    var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);

    if (!oEntityType || !oEntityType.property) {
        console.log("VH entity type metadata not found for:", sEntitySet);
        return null;
    }

    return {
        entitySetName: sSetName,
        entityType: oEntityType,
        properties: oEntityType.property.map(function (oProp) {
            return oProp.name;
        })
    };
},

_resolveWarehouseFilterField: function (oMeta) {
    if (!oMeta || !oMeta.properties || !oMeta.properties.length) {
        return null;
    }

    var aProps = oMeta.properties;

    var aPriority = [
        "WarehouseNo",
        "Lgnum",
        "LGNUM"
    ];

    for (var i = 0; i < aPriority.length; i++) {
        var sWanted = aPriority[i];
        var sFound = aProps.find(function (sProp) {
            return sProp.toLowerCase() === sWanted.toLowerCase();
        });
        if (sFound) {
            return sFound;
        }
    }

    return null;
},


_resolveConfiguredField: function (oMeta, sConfiguredField) {
    if (!oMeta || !oMeta.properties || !sConfiguredField) {
        return null;
    }

    return oMeta.properties.find(function (sProp) {
        return sProp.toLowerCase() === String(sConfiguredField).toLowerCase();
    }) || null;
},

_getNumericValidationConfig: function () {
    return [
        {
            fieldPath: "NumberOfSalesOrderItems",
            label: "Sales Order Items",
            min: 0,
            max: null,
            decimals: 3,
            allowEmpty: true
        },
        {
            fieldPath: "RecommendedStorageQuantity",
            label: "Recommended Storage Quantity",
            min: 0,
            max: null,
            decimals: 3,
            allowEmpty: true
        },
        {
            fieldPath: "DimentioRatio",
            label: "Dimension Ratio",
            min: 0,
            max: null,
            decimals: 2,
            allowEmpty: true
        },
        {
            fieldPath: "MinShelfLife",
            label: "Min Shelf Life",
            min: 0,
            max: null,
            decimals: 0,
            allowEmpty: true
        }
    ];
},


_validateNumericField: function (oInput, oCtx, oCfg) {
    var oModel = this.getView().getModel();

    if (!oInput || !oCtx || !oCfg) {
        return true;
    }

    var sValue = oInput.getValue ? String(oInput.getValue()).trim() : "";
    var sPath = oCfg.fieldPath;

    //  Empty allowed -> set NULL
    if (!sValue) {
        oModel.setProperty(sPath, null, oCtx);
        oModel.checkUpdate(true);

        if (oInput.setValueState) {
            oInput.setValueState("None");
            oInput.setValueStateText("");
        }

        return true;
    }

    //  Negative values are not allowed
    if (sValue.indexOf("-") !== -1) {
        oModel.setProperty(sPath, null, oCtx);
        oModel.checkUpdate(true);

        if (oInput.setValue) {
            oInput.setValue("");
        }

        if (oInput.setValueState) {
            oInput.setValueState("Error");
            oInput.setValueStateText(oCfg.label + " cannot be negative.");
        }

        return false;
    }

    // Normalize comma decimal
    var sNormalized = sValue.replace(",", ".");

    //  Only digits and one decimal separator allowed
    
var sRegex = oCfg.decimals > 0
    ? "^\\d+(\\.\\d{1," + oCfg.decimals + "})?$"
    : "^\\d+$";


    var oRegex = new RegExp(sRegex);

    if (!oRegex.test(sNormalized)) {
        oModel.setProperty(sPath, null, oCtx);
        oModel.checkUpdate(true);

        if (oInput.setValue) {
            oInput.setValue("");
        }

        if (oInput.setValueState) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
                oCfg.label + " must be a valid non-negative number."
            );
        }

        return false;
    }

    var nValue = Number(sNormalized);

    if (isNaN(nValue)) {
        oModel.setProperty(sPath, null, oCtx);
        oModel.checkUpdate(true);

        if (oInput.setValue) {
            oInput.setValue("");
        }

        if (oInput.setValueState) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
                oCfg.label + " must be a valid number."
            );
        }

        return false;
    }

    //  Min validation
    if (oCfg.min !== null && oCfg.min !== undefined && nValue < oCfg.min) {
        oModel.setProperty(sPath, null, oCtx);
        oModel.checkUpdate(true);

        if (oInput.setValue) {
            oInput.setValue("");
        }

        if (oInput.setValueState) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
                oCfg.label + " must be greater than or equal to " + oCfg.min + "."
            );
        }

        return false;
    }

    //  Max validation, only if configured
    if (oCfg.max !== null && oCfg.max !== undefined && nValue > oCfg.max) {
        oModel.setProperty(sPath, null, oCtx);
        oModel.checkUpdate(true);

        if (oInput.setValue) {
            oInput.setValue("");
        }

        if (oInput.setValueState) {
            oInput.setValueState("Error");
            oInput.setValueStateText(
                oCfg.label + " must be less than or equal to " + oCfg.max + "."
            );
        }

        return false;
    }

    //  Valid -> write normalized numeric value
    oModel.setProperty(sPath, nValue, oCtx);
    oModel.checkUpdate(true);

    if (oInput.setValueState) {
        oInput.setValueState("None");
        oInput.setValueStateText("");
    }

    return true;
},


_wireNumericValidation: function () {
    var oSmartTable = this.byId("LineItemsSmartTable");
    var oTable = oSmartTable && oSmartTable.getTable();
    var aCfg = this._getNumericValidationConfig();

    if (!oTable) {
        return;
    }

    var aItems = oTable.getItems
        ? oTable.getItems()
        : (oTable.getRows ? oTable.getRows() : []);

    if (!aItems || !aItems.length) {
        return;
    }

    aCfg.forEach(function (oCfg) {
        var iColIdx = this._findColumnIndexByFieldPath(oTable, oCfg.fieldPath);
        console.log("NUMERIC FIELD:", oCfg.fieldPath, "COLUMN INDEX:", iColIdx);

        if (iColIdx < 0) {
            return;
        }

        aItems.forEach(function (oItem) {
            var aCells = oItem.getCells ? oItem.getCells() : [];
            var oCell = aCells[iColIdx];
            var oInput = this._resolveInputFromCell(oCell);

            
if (!oInput) {
    console.log("No input resolved for:", oCfg.fieldPath);
    return;
}
            var sAttachKey = "numericValidationAttached_" + oCfg.fieldPath;

            if (oInput.data && oInput.data(sAttachKey)) {
                return;
            }

            if (oInput.data) {
                oInput.data(sAttachKey, true);
            }

            var fnValidate = function () {
                var oCtx = oItem.getBindingContext && oItem.getBindingContext();
                this._validateNumericField(oInput, oCtx, oCfg);
            }.bind(this);

            if (oInput.attachChange) {
                oInput.attachChange(fnValidate);
            }

            if (oInput.attachLiveChange) {
                oInput.attachLiveChange(function () {
                    // prevent minus immediately
                    var sValue = oInput.getValue ? oInput.getValue() : "";
                    if (sValue && sValue.indexOf("-") !== -1) {
                        oInput.setValue("");
                        oInput.setValueState("Error");
                        oInput.setValueStateText(oCfg.label + " cannot be negative.");
                    }
                });
            }

            if (oInput.attachBrowserEvent) {
                oInput.attachBrowserEvent("focusout", fnValidate);
            }

        }.bind(this));
    }.bind(this));
},


_validateAllNumericFieldsBeforeSave: function () {
    var oModel = this.getView().getModel();
    var oSmartTable = this.byId("LineItemsSmartTable");
    var oTable = oSmartTable && oSmartTable.getTable();
    var aCfg = this._getNumericValidationConfig();

    if (!oTable) {
        return true;
    }

    var aItems = oTable.getItems
        ? oTable.getItems()
        : (oTable.getRows ? oTable.getRows() : []);

    var mPending = oModel.getPendingChanges ? oModel.getPendingChanges() : {};
    var bAllValid = true;

    aItems.forEach(function (oItem) {
        var oCtx = oItem.getBindingContext && oItem.getBindingContext();

        if (!oCtx) {
            return;
        }

        var sPendingKey = oCtx.getPath().replace(/^\//, "");
        var oPendingRow = mPending[sPendingKey];

        if (!oPendingRow) {
            return;
        }

        aCfg.forEach(function (oCfg) {
            if (!(oCfg.fieldPath in oPendingRow)) {
                return;
            }

            var oInput = this._findInputInRowByFieldPath(oItem, oCfg.fieldPath);
            var bValid = this._validateNumericField(oInput, oCtx, oCfg);

            if (!bValid) {
                bAllValid = false;
            }

        }.bind(this));
    }.bind(this));

    return bAllValid;
},

_isNumericField: function (oBinding) {

    var oType = oBinding && oBinding.getType && oBinding.getType();
    if (!oType) {
        return false;
    }

    var sTypeName = oType.getName();

    return (
        sTypeName === "sap.ui.model.odata.type.Int16" ||
        sTypeName === "sap.ui.model.odata.type.Int32" ||
        sTypeName === "sap.ui.model.odata.type.Decimal" ||
        sTypeName === "sap.ui.model.odata.type.Double"
    );
},


_isVHField: function (oCfg) {
    return !!(oCfg && oCfg.entitySet);
},

_getFieldValidationMode: function (oInput, oCfg) {

    var oBinding = oInput && oInput.getBinding("value");

    var bNumeric = this._isNumericField(oBinding);
    var bHasVH = this._isVHField(oCfg);

    // VH code fields → strict
    if (bHasVH) {
        return "VH";
    }

    //  numeric fields without VH → free input
    if (bNumeric && !bHasVH) {
        return "NUMERIC";
    }

    return "NONE";
},

_openExtendDialog: function () {
    var oModel = this.getView().getModel();

    if (this.oContextNewEntry) {
        this.deleteModelEntry(this.oContextNewEntry);
        this.oContextNewEntry = null;
    }

    this.oContextNewEntry = oModel.createEntry("/ZEWM_C_MATERIAL", {
        properties: {
            MaterialId: "",
            MaterialNumber: this._extendSourceMaterial || "",
            MaterialDesc: this._extendSourceMaterialDesc || "",

            // target values must be entered by user
            WarehouseNo: "",
            Entitled: "",

            // prefill only if same across selected rows
          
PutawayControl: "",
StorSectInd: "",
StockRemovalCtrl: "",
BulkStorage: "",
ProcBlockProfile: "",
CtrlIndicatorProcessType: "",
ProductLoadCategory: "",
CycleCountingIndicator: "",
MinShelfLife: "",
QuantityClassMerchandiseDistr: "",
PrefferedAltUoMforWarehouseOp: "",
QualityInspectionGroup: "",
StorageBinType: "",
StockDeterminationGroup: "",
RelevanceForTwoStepPicking: "",
StagingAreaDoorDetGroup: "",
NumberOfSalesOrderItems: "",
RecommendedStorageQuantity: "",
DimentioRatio: "",
WeightIndicator: "",
VolumeIndicator: "",
LengthIndicator: "",
WidthIndicator: "",
HeightIndicator: ""

        }
    });

    this.getView().byId("sfCreate").setBindingContext(this.oContextNewEntry);
    this.getView().byId("entitled").setEditable(false);

    if (this.oDialog.setTitle) {
        this.oDialog.setTitle("Extend Material Assignment");
    }

    // Optional: if you have text fields in fragment, populate them here later
    this.oDialog.open();
},


onExtend: function () {
    var aSelectedItems = this.table ? this.table.getSelectedItems() : [];

    if (!this._canExtendSelection(aSelectedItems)) {
        sap.m.MessageBox.error("Extend is only available for 1 or 2 rows with the same source warehouse.");
        return;
    }

    var oFirstSource = aSelectedItems[0].getBindingContext().getObject();

    this._dialogMode = "EXTEND";
    this._extendSourceWarehouse = oFirstSource.WarehouseNo || "";
    this._extendSourceMaterial = oFirstSource.MaterialNumber || "";
    this._extendSourceMaterialDesc = oFirstSource.MaterialDesc || "";

    if (!this.oDialog) {
        this.loadFragment({
            name: "bearingpoint.ewm.materialmaintenance.view.fragments.Create"
        }).then(function (oDialog) {
            this.oDialog = oDialog;
            this._openExtendDialog();
        }.bind(this));
    } else {
        this._openExtendDialog();
    }
},


_resolveValueField: function (oMeta, oCfg) {
    if (!oMeta || !oMeta.properties || !oCfg) {
        return null;
    }

    var aProps = oMeta.properties;
    var aCandidates = [];

    //  Explicit valueField has highest priority
    if (oCfg.valueField) {
        aCandidates.push(oCfg.valueField);
    }

    if (oCfg.valueFieldCandidates && Array.isArray(oCfg.valueFieldCandidates)) {
        oCfg.valueFieldCandidates.forEach(function (sCandidate) {
            if (aCandidates.indexOf(sCandidate) === -1) {
                aCandidates.push(sCandidate);
            }
        });
    }

    if (oCfg.fieldPath && aCandidates.indexOf(oCfg.fieldPath) === -1) {
        aCandidates.push(oCfg.fieldPath);
    }

    for (var i = 0; i < aCandidates.length; i++) {
        var sCandidate = aCandidates[i];

        var sFound = aProps.find(function (sProp) {
            return sProp.toLowerCase() === String(sCandidate).toLowerCase();
        });

        if (sFound) {
            return sFound;
        }
    }

    console.log(
        "No matching value field found in VH metadata for:",
        oCfg.fieldPath,
        "Candidates:",
        aCandidates,
        "Available:",
        aProps
    );

    return null;
},


_buildDynamicVhFilters: function (sWarehouseNo, sValue, oCfg) {
    var oMeta = this._getVhEntityMeta(oCfg.entitySet);

    if (!oMeta) {
        return {
            ok: false,
            filters: [],
            warehouseField: null,
            valueField: null
        };
    }

    var aFilters = [];
    
var sWarehouseField =
    this._resolveConfiguredField(oMeta, oCfg.warehouseField) ||
    this._resolveWarehouseFilterField(oMeta);

var sValueField = this._resolveValueField(oMeta, oCfg);


    //  only add warehouse filter if entity actually exposes such field
    if (sWarehouseNo && sWarehouseField) {
        aFilters.push(new sap.ui.model.Filter(
            sWarehouseField,
            sap.ui.model.FilterOperator.EQ,
            sWarehouseNo
        ));
    }

    //  value field is mandatory for VH lookup
    if (!sValueField) {
        return {
            ok: false,
            filters: aFilters,
            warehouseField: sWarehouseField,
            valueField: null
        };
    }

    aFilters.push(new sap.ui.model.Filter(
        sValueField,
        sap.ui.model.FilterOperator.EQ,
        sValue
    ));

console.log("VH FILTERS BUILT:", {
        fieldPath: oCfg.fieldPath,
        warehouseField: sWarehouseField,
        warehouseNo: sWarehouseNo,
        valueField: sValueField,
        value: sValue,
        entitySet: oCfg.entitySet
    });

    return {
        ok: true,
        filters: aFilters,
        warehouseField: sWarehouseField,
        valueField: sValueField
    };
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

    //  If inner control exists → use it
    if (aInner && aInner.length) {
        return aInner[0];
    }

    //  IMPORTANT fallback → return SmartField itself
    // (prevents losing VH icon when inner control not ready yet)
    return oCell;
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


_findInputInRowByFieldPath: function (oItem, sFieldPath) {
    if (!oItem || !oItem.findAggregatedObjects) {
        return null;
    }

    var aCandidates = oItem.findAggregatedObjects(true, function (oControl) {
        if (!oControl.getBinding) {
            return false;
        }

        var oBinding = oControl.getBinding("value");
        return !!(oBinding && oBinding.getPath && oBinding.getPath() === sFieldPath);
    });

    return aCandidates.length ? aCandidates[0] : null;
},


_focusInvalidField: function (oItem, sFieldPath) {

    if (!oItem || !oItem.findAggregatedObjects) {
        return;
    }

    var aControls = oItem.findAggregatedObjects(true);

    for (var i = 0; i < aControls.length; i++) {

        var oControl = aControls[i];

        if (oControl.getBinding) {
            var oBinding = oControl.getBinding("value");

            if (oBinding && oBinding.getPath() === sFieldPath) {

                if (oControl.setValueState) {
                    oControl.setValueState("Error");
                }

                if (oControl.focus) {
                    setTimeout(function () {
                        oControl.focus();
                    }, 200);
                }

                return oControl;
            }
        }
    }

    return null;
},


_findColumnIndexByFieldPath: function (oTable, sFieldPath) {
    var aColumns = oTable.getColumns() || [];

    for (var i = 0; i < aColumns.length; i++) {
        var oColumn = aColumns[i];
        var vP13nData = oColumn.data("p13nData");
        var sLeadingProperty = "";

        if (typeof vP13nData === "string") {
            try {
                sLeadingProperty = JSON.parse(vP13nData).leadingProperty || "";
            } catch (e) {
                sLeadingProperty = "";
            }
        } else if (vP13nData && typeof vP13nData === "object") {
            sLeadingProperty = vP13nData.leadingProperty || "";
        }

        if (sLeadingProperty === sFieldPath) {
            return i;
        }

        if (oColumn.getSortProperty && oColumn.getSortProperty() === sFieldPath) {
            return i;
        }

        if (oColumn.getFilterProperty && oColumn.getFilterProperty() === sFieldPath) {
            return i;
        }
    }

    return -1;
},



onSaveData: async function () {

    var oModel = this.getView().getModel();
    var oSmartTable = this.byId("LineItemsSmartTable");

    // give UI time to flush input values
    await new Promise(function (resolve) {
        setTimeout(resolve, 200);
    });

    // nothing changed -> exit cleanly
    if (!oModel.hasPendingChanges()) {
        console.log("No changes to save");
        return true;
    }

    var oTable = oSmartTable && oSmartTable.getTable();
    var aItems = [];

    if (oTable) {
        aItems = oTable.getItems
            ? oTable.getItems()
            : (oTable.getRows ? oTable.getRows() : []);
    }

    var mPending = oModel.getPendingChanges ? oModel.getPendingChanges() : {};

    // Quantity + UoM consistency guard ONLY for changed rows
    for (var i = 0; i < aItems.length; i++) {
        var oCtx = aItems[i].getBindingContext && aItems[i].getBindingContext();
        if (!oCtx) {
            continue;
        }

        var sPendingKey = oCtx.getPath().replace(/^\//, "");
        var oPendingRow = mPending[sPendingKey];

        if (!oPendingRow) {
            continue;
        }

        var qty = oCtx.getProperty("RecommendedStorageQuantity");
        var uom = oCtx.getProperty("PrefferedAltUoMforWarehouseOp");

        var sQty = String(qty || "").trim();
        var nQty = parseFloat(sQty.replace(",", "."));
        var bHasQuantity = !isNaN(nQty) && nQty > 0;

        if (bHasQuantity && !uom) {
            sap.m.MessageBox.error(
                "Preferred UoM is required when Recommended Storage Quantity is filled."
            );
            return false;
        }
    }

var bNumericValid = this._validateAllNumericFieldsBeforeSave();

if (!bNumericValid) {
    sap.m.MessageBox.error("Fix highlighted numeric fields before saving.");
    return false;
}

    console.log("Starting VH validation BEFORE save...");
    

    var bValid = await this._validateAllConfiguredVHFieldsBeforeSave();

    console.log("Validation finished. Result =", bValid);

    if (!bValid) {
        sap.m.MessageBox.error("Fix highlighted fields before saving.");
        return false;
    }

    return new Promise(function (resolve) {

        oModel.submitChanges({

            success: function (oResponse) {
            console.log(" BATCH RESPONSE:", oResponse);


if (oResponse && oResponse.__batchResponses && oResponse.__batchResponses.length > 0) {
    var aChanges = oResponse.__batchResponses[0].__changeResponses;
    console.log(" CHANGE RESPONSES:", aChanges);
    console.log("COUNT:", aChanges ? aChanges.length : 0);
}

                var bHasError = false;

                if (oResponse && oResponse.__batchResponses) {
                    oResponse.__batchResponses.forEach(function (oBatch) {

                        if (oBatch.__changeResponses) {
                            oBatch.__changeResponses.forEach(function (oChange) {

                                if (oChange.response &&
                                    parseInt(oChange.response.statusCode, 10) >= 400) {
                                    bHasError = true;
                                }

                                if (oChange.response &&
                                    oChange.response.body &&
                                    oChange.response.body.indexOf("error") !== -1) {
                                    bHasError = true;
                                }
                            });
                        }

                        if (oBatch.response &&
                            parseInt(oBatch.response.statusCode, 10) >= 400) {
                            bHasError = true;
                        }
                    });
                }

                if (bHasError) {

                    var sBackendMsg = "Unknown backend error.";

                    if (oResponse && oResponse.__batchResponses) {
                        oResponse.__batchResponses.forEach(function (oBatch) {

                            if (oBatch.__changeResponses) {
                                oBatch.__changeResponses.forEach(function (oChange) {

                                    if (oChange.response && oChange.response.body) {
                                        var sBody = oChange.response.body;

                                        try {
                                            var oError = JSON.parse(sBody);

                                            if (oError.error &&
                                                oError.error.message &&
                                                oError.error.message.value) {
                                                sBackendMsg = oError.error.message.value;
                                            } else if (oError.error &&
                                                       oError.error.innererror &&
                                                       oError.error.innererror.errordetails &&
                                                       oError.error.innererror.errordetails.length > 0) {
                                                sBackendMsg = oError.error.innererror.errordetails[0].message;
                                            }

                                        } catch (e) {
                                            if (typeof sBody === "string" && sBody.length < 500) {
                                                sBackendMsg = sBody;
                                            }
                                            console.log("RAW BACKEND BODY:", sBody);
                                        }
                                    }

                                });
                            }

                        });
                    }

                    console.log("FINAL BACKEND ERROR MESSAGE:", sBackendMsg);
                    sap.m.MessageBox.error(sBackendMsg);
                    resolve(false);
                    return;
                }

                sap.m.MessageToast.show("Data successfully saved");
                resolve(true);

            }.bind(this),

            error: function () {
                sap.m.MessageBox.error("Error during save");
                resolve(false);
            }
        });

    }.bind(this));
},


_setEmptyValue: function (oModel, oCtx, sFieldPath) {

    if (!oCtx) {
        return;
    }

    console.log("Clearing field:", sFieldPath);

    //  IMPORTANT: use null, not empty string
    oModel.setProperty(sFieldPath, null, oCtx);

},


_wireGenericVHValidation: function () {

    var oSmartTable = this.byId("LineItemsSmartTable");
    var oTable = oSmartTable && oSmartTable.getTable();
    var aCfg = this._getVhValidationConfig();

    if (!oTable) {
        return;
    }

    var aItems = oTable.getItems
        ? oTable.getItems()
        : (oTable.getRows ? oTable.getRows() : []);

    if (!aItems || !aItems.length) {
        return;
    }

    aCfg.forEach(function (oCfg) {

        var iColIdx = this._findColumnIndexByFieldPath(oTable, oCfg.fieldPath);

        if (iColIdx < 0) {
            console.log("Column not found for fieldPath:", oCfg.fieldPath);
            return;
        }

        aItems.forEach(function (oItem) {

            var aCells = oItem.getCells ? oItem.getCells() : [];
            var oCell = aCells[iColIdx];
            var oInput = this._resolveInputFromCell(oCell);

            if (!oInput) {
                console.log("No input resolved for:", oCfg.fieldPath);
                return;
            }

var fnRememberContext = function () {
    this._rememberVhContext(oItem, oCfg);
}.bind(this);

// use V2 key so browser/session does not reuse old attachment flags
var sRememberKey = "vhRememberAttachedV2_" + oCfg.fieldPath;

var fnAttachRemember = function (oCtrl) {
    if (!oCtrl) {
        return;
    }

    if (oCtrl.data && oCtrl.data(sRememberKey)) {
        return;
    }

    if (oCtrl.data) {
        oCtrl.data(sRememberKey, true);
    }

    if (oCtrl.attachBrowserEvent) {
        oCtrl.attachBrowserEvent("focusin", fnRememberContext);
        oCtrl.attachBrowserEvent("mousedown", fnRememberContext);
        oCtrl.attachBrowserEvent("click", fnRememberContext);
    }

    if (oCtrl.attachValueHelpRequest) {
        oCtrl.attachValueHelpRequest(fnRememberContext);
    }
};

// attach to resolved input
fnAttachRemember(oInput);

// attach to original SmartField/cell too
fnAttachRemember(oCell);

// attach to inner controls of SmartField/cell if available
if (oCell && oCell.getInnerControls) {
    var aInnerControls = oCell.getInnerControls();
    if (aInnerControls && aInnerControls.length) {
        aInnerControls.forEach(function (oInnerCtrl) {
            fnAttachRemember(oInnerCtrl);
        });
    }
}

if (oCell && oCell.findAggregatedObjects) {
    var aInnerInputs = oCell.findAggregatedObjects(true, function (oControl) {
        return oControl.isA && (
            oControl.isA("sap.m.Input") ||
            oControl.isA("sap.ui.comp.smartfield.SmartField")
        );
    });

    aInnerInputs.forEach(function (oInnerCtrl) {
        fnAttachRemember(oInnerCtrl);
    });
}


var sMode = this._getFieldValidationMode(oInput, oCfg);

if (sMode === "VH") {
    if (oInput.setShowValueHelp) {
        oInput.setShowValueHelp(true);
    }

    // keep editable so user can clear value
    if (oInput.setEditable) {
        oInput.setEditable(true);
    }
}


            var sAttachKey = "vhValidationAttached_" + oCfg.fieldPath;

            if (oInput.data && oInput.data(sAttachKey)) {
                return;
            }

            if (oInput.data) {
                oInput.data(sAttachKey, true);
            }

            
var fnHandler = function () {
    setTimeout(function () {

        var oModel = this.getView().getModel();
        var oCtx = oItem && oItem.getBindingContext && oItem.getBindingContext();

        if (!oModel || !oCtx) {
            return;
        }

        var mPending = oModel.getPendingChanges ? oModel.getPendingChanges() : {};
        var sPendingKey = oCtx.getPath().replace(/^\//, "");
        var oPendingRow = mPending[sPendingKey];

        // Do not validate old backend values just because edit mode/rendering happened
        if (!oPendingRow || !(oCfg.fieldPath in oPendingRow)) {
            if (oInput && oInput.setValueState) {
                oInput.setValueState("None");
                oInput.setValueStateText("");
            }
            return;
        }

        // Read the committed model value, not the possibly stale UI value
        var vModelValue = oCtx.getProperty(oCfg.fieldPath);
        var sModelValue = (vModelValue === null || vModelValue === undefined)
            ? ""
            : String(vModelValue).trim();

        // Sync UI FROM model, never model FROM UI here
        if (oInput && oInput.setValue && oInput.getValue) {
            var sCurrentUiValue = String(oInput.getValue() || "").trim();

            if (sCurrentUiValue !== sModelValue) {
                oInput.setValue(sModelValue);
            }
        }

        var sWarehouseNo = this._getRowWarehouseNo(oItem);

        console.log(
            "VALIDATING CHANGED FIELD:",
            oCfg.fieldPath,
            "MODEL VALUE:",
            sModelValue,
            "WAREHOUSE:",
            sWarehouseNo
        );

       this._validateVHField(oInput, sWarehouseNo, oCfg, sModelValue);

    }.bind(this), 500);
}.bind(this);


var sValidationAttachKey = "vhValidationAttachedV2_" + oCfg.fieldPath;

var fnAttachValidation = function (oCtrl) {
    if (!oCtrl) {
        return;
    }

    if (oCtrl.data && oCtrl.data(sValidationAttachKey)) {
        return;
    }

    if (oCtrl.data) {
        oCtrl.data(sValidationAttachKey, true);
    }

    if (oCtrl.attachChange) {
        oCtrl.attachChange(fnHandler);
    }
};

// attach validation to both inner input and SmartField/cell
fnAttachValidation(oInput);
fnAttachValidation(oCell);


        }.bind(this));

    }.bind(this));
},


_lockVHInputs: function () {

    var oSmartTable = this.byId("LineItemsSmartTable");
    var oTable = oSmartTable && oSmartTable.getTable();

    if (!oTable) return;

    var aItems = oTable.getItems
        ? oTable.getItems()
        : (oTable.getRows ? oTable.getRows() : []);

    var aCfg = this._getVhValidationConfig();

    aItems.forEach(function (oItem) {

        aCfg.forEach(function (oCfg) {

            var oInput = this._findInputInRowByFieldPath(oItem, oCfg.fieldPath);

            if (!oInput) return;

            //  Disable typing
            

if (oInput.setShowValueHelp) {
    oInput.setShowValueHelp(true);
}

if (oInput.setEditable) {
    oInput.setEditable(true);
}


        }.bind(this));

    }.bind(this));
},


_forceAllColumnsVisible: function () {

    var oSmartTable = this.byId("LineItemsSmartTable");
    var oTable = oSmartTable && oSmartTable.getTable();

    if (!oTable) return;

    var aColumns = oTable.getColumns();

    aColumns.forEach(function (oColumn) {
        oColumn.setVisible(true);
    });

    console.log("All columns forced visible");
},




_validateVHField: function (oInput, sWarehouseNo, oCfg, sForcedValue) {

    var oModel = this.getView().getModel();

   
var sValue = "";

if (sForcedValue !== undefined && sForcedValue !== null) {
    sValue = String(sForcedValue).trim();
} else {
    sValue = oInput && oInput.getValue ? String(oInput.getValue() || "").trim() : "";
}


    var oBinding = oInput && oInput.getBinding && oInput.getBinding("value");
    var oCtx = oBinding && oBinding.getContext ? oBinding.getContext() : null;
    var sRelativePath = oBinding && oBinding.getPath ? oBinding.getPath() : "";
    var sAbsolutePath = (oCtx && sRelativePath)
        ? (oCtx.getPath() + "/" + sRelativePath)
        : "";

    var sMode = this._getFieldValidationMode(oInput, oCfg);

    //  numeric field without VH -> allow typing
    if (sMode === "NUMERIC") {
        if (oInput.setValueState) {
            oInput.setValueState("None");
            oInput.setValueStateText("");
        }
        return Promise.resolve(true);
    }

    //  empty allowed

if (!sValue) {
    if (oCtx && sRelativePath) {
        oModel.setProperty(sRelativePath, null, oCtx);
        oModel.checkUpdate(true);
    }

    if (oInput && oInput.setValueState) {
        oInput.setValueState("None");
        oInput.setValueStateText("");
    }

    return Promise.resolve(true);
}


    return new Promise(function (resolve) {

        var oFilterInfo = this._buildDynamicVhFilters(sWarehouseNo, sValue, oCfg);

        if (!oFilterInfo.ok) {
            if (oInput.setValueState) {
                oInput.setValueState("Error");
                oInput.setValueStateText("VH metadata mismatch. Check entity/value field configuration.");
            }
            console.log("VH filter build failed for field:", oCfg.fieldPath, oFilterInfo);
            resolve(false);
            return;
        }

        oModel.read(oCfg.entitySet, {
            filters: oFilterInfo.filters,

            success: function (oData) {
                var bValid = !!(oData && oData.results && oData.results.length > 0);

             


if (bValid) {

    // ✅ Do not write to model here.
    // SmartField/OData binding already wrote the value.

    if (oInput && oInput.setValueState) {
        oInput.setValueState("None");
        oInput.setValueStateText("");
    }

} else {

   
    // clear invalid value from model

if (oCtx && sRelativePath) {
    oModel.setProperty(sRelativePath, null, oCtx);
    oModel.checkUpdate(true);
}

    if (oInput && oInput.setValue) {
        oInput.setValue("");
    }

    //  show inline error (WAREHOUSE-AWARE)
    if (oInput && oInput.setValueState) {
        oInput.setValueState("Error");
        oInput.setValueStateText(
            sWarehouseNo
                ? oCfg.message + " (Invalid for warehouse " + sWarehouseNo + ")"
                : oCfg.message
        );
    }

    //  optional: small feedback (non-blocking)
    sap.m.MessageToast.show("Invalid value removed. Use Value Help.");
    resolve(false);
    return;
                }

                resolve(true);
            }.bind(this),

            error: function (oError) {
                console.log("VH validation read failed for field:", oCfg.fieldPath, oError);

                if (oInput.setValueState) {
                    oInput.setValueState("Error");
                    oInput.setValueStateText("Validation failed");
                }

                resolve(false);
            }
        });

    }.bind(this));
},



_rememberVhContext: function (oItem, oCfg) {
    var oCtx = oItem && oItem.getBindingContext && oItem.getBindingContext();
    var sWarehouseNo = oCtx ? (oCtx.getProperty("WarehouseNo") || "") : "";

    this._lastVhContext = {
        warehouseNo: sWarehouseNo,
        fieldPath: oCfg && oCfg.fieldPath ? oCfg.fieldPath : ""
    };

    console.log("REMEMBER VH CONTEXT:", this._lastVhContext);
},


_validateAllConfiguredVHFieldsBeforeSave: function () {
    var oSmartTable = this.byId("LineItemsSmartTable");
    var oTable = oSmartTable && oSmartTable.getTable();
    var aCfg = this._getVhValidationConfig();
    var oModel = this.getView().getModel();

    if (!oTable) {
        return Promise.resolve(true);
    }

    var aItems = oTable.getItems
        ? oTable.getItems()
        : (oTable.getRows ? oTable.getRows() : []);

    if (!aItems || !aItems.length) {
        return Promise.resolve(true);
    }

    var aPromises = [];
    var mPending = oModel.getPendingChanges ? oModel.getPendingChanges() : {};

    aItems.forEach(function (oItem) {

        var oCtx = oItem.getBindingContext && oItem.getBindingContext();
        if (!oCtx) {
            return;
        }

        var sPendingKey = oCtx.getPath().replace(/^\//, "");
        var oPendingRow = mPending[sPendingKey];

        if (!oPendingRow) {
            return; // unchanged row
        }

        var sWarehouseNo = oCtx.getProperty("WarehouseNo") || "";

        aCfg.forEach(function (oCfg) {

            // validate only fields that actually changed
            if (!(oCfg.fieldPath in oPendingRow)) {
                return;
            }

            var sValue = oCtx.getProperty(oCfg.fieldPath);
            sValue = (sValue === null || sValue === undefined) ? "" : String(sValue).trim();

           
//  allow empty BUT also PUSH it to model

if (!sValue) {

    var oCtxLocal = oItem.getBindingContext();

    //  use generic handler
    this._setEmptyValue(oModel, oCtxLocal, oCfg.fieldPath);

    var oInput = this._findInputInRowByFieldPath(oItem, oCfg.fieldPath);

    if (oInput && oInput.setValueState) {
        oInput.setValueState("None");
        oInput.setValueStateText("");
    }

    aPromises.push(Promise.resolve(true));
    return;
}



            var oInput = this._findInputInRowByFieldPath(oItem, oCfg.fieldPath);

            
var oFilterInfo = this._buildDynamicVhFilters(sWarehouseNo, sValue, oCfg);

if (!oFilterInfo.ok) {
    if (oInput && oInput.setValueState) {
        oInput.setValueState("Error");
        oInput.setValueStateText("VH metadata mismatch. Check entity/value field configuration.");
    }
    aPromises.push(Promise.resolve(false));
    return;
}


           var sEntitySet = oCfg.entitySet;
var sFieldPathLocal = oCfg.fieldPath;
var sMessageLocal = oCfg.message;

aPromises.push(new Promise(function (resolve) {

    
oModel.read(sEntitySet, {
    filters: oFilterInfo.filters,


        success: function (oData) {

            var bValid = !!(oData && oData.results && oData.results.length > 0);

            if (oInput && oInput.setValueState) {
                oInput.setValueState(bValid ? "None" : "Error");
                oInput.setValueStateText(
                    bValid
                        ? ""
                        : (sWarehouseNo
                            ? sMessageLocal + " (Invalid for warehouse " + sWarehouseNo + ")"
                            : sMessageLocal)
                );
            }

            if (!bValid) {

                console.log(
                    "INVALID FIELD:",
                    sFieldPathLocal,
                    "Value:", sValue,
                    "Warehouse:", sWarehouseNo
                );

                if (oInput && oInput.focus) {
                    setTimeout(function () {
                        oInput.focus();
                    }, 150);
                }

                resolve(false);
                return;
            }

            resolve(true);
        }.bind(this),

        error: function () {
            if (oInput && oInput.setValueState) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Validation failed.");
            }
            resolve(false);
        }.bind(this)
    });

}.bind(this)));

        }.bind(this));
    }.bind(this));

    return Promise.all(aPromises).then(function (aResults) {
        var bAllValid = aResults.every(Boolean);

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
    var oView = this.getView();
    var oCreateBtn = oView.byId("_IDGenButton");
    var oMassChangeBtn = oView.byId("_MassChange");

    var aSelectedItems = this.table ? this.table.getSelectedItems() : [];

    // default = both disabled
    var bCreate = false;
    var bMassChange = false;

    // no selection → both disabled
    
if (!aSelectedItems.length) {
    oCreateBtn.setEnabled(false);
    oMassChangeBtn.setEnabled(false);

    var oExtendBtnEmpty = oView.byId("_ExtendButton");
    if (oExtendBtnEmpty) {
        oExtendBtnEmpty.setEnabled(false);
    }

    return;
}


    // take first warehouse as reference
    var oFirstObj = aSelectedItems[0].getBindingContext()?.getObject();
    var sWarehouse = (oFirstObj && oFirstObj.WarehouseNo) || "";

    var bAllEmpty = true;
    var bAllExtended = true;
    var bAllSameWarehouse = true;

    for (var i = 0; i < aSelectedItems.length; i++) {
        var oObj = aSelectedItems[i].getBindingContext()?.getObject();
        if (!oObj) {
            continue;
        }

        var sRowWarehouse = oObj.WarehouseNo || "";

        // CREATE logic
        if (sRowWarehouse) {
            bAllEmpty = false;
        } else {
            bAllExtended = false;
        }

        // MASS CHANGE logic
        if (sRowWarehouse !== sWarehouse) {
            bAllSameWarehouse = false;
        }
    }

    // ------------------------------------------------
    // CREATE
    // enabled only when all selected rows are NOT extended
    // ------------------------------------------------
    if (bAllEmpty) {
        bCreate = true;
    }

    // ------------------------------------------------
    // MASS CHANGE
    // enabled only when:
    // - at least 2 rows
    // - all extended
    // - same warehouse
    // ------------------------------------------------
   
//  NEW CLEAN MASS CHANGE LOGIC
bMassChange = this._canMassChangeSelection(aSelectedItems);

//  NEW EXTEND LOGIC
var bExtend = this._canExtendSelection(aSelectedItems);
console.log("EXTEND ENABLE?", bExtend, aSelectedItems.length);

    // ------------------------------------------------
    // show message ONLY once when invalid multi-select
    // ------------------------------------------------
    if (aSelectedItems.length > 1 && bAllExtended && !bAllSameWarehouse) {
        if (!this._bWarehouseWarningShown) {
            this._bWarehouseWarningShown = true;
            this.messageInformationDialog();

            // reset flag after short delay (prevents spam)
            setTimeout(() => {
                this._bWarehouseWarningShown = false;
            }, 300);
        }
    }

 
oCreateBtn.setEnabled(bCreate);
oMassChangeBtn.setEnabled(bMassChange);

var oExtendBtn = oView.byId("_ExtendButton");
oExtendBtn && oExtendBtn.setEnabled(bExtend);

},

_applyNonUpdatableFieldsReadOnly: function () {
    var oTable = this.byId("_IDGenTable");

    if (!oTable || !oTable.getItems) {
        return;
    }

    var aReadOnlyFields = [
    ];

    oTable.getItems().forEach(function (oItem) {
        if (!oItem.findAggregatedObjects) {
            return;
        }

        aReadOnlyFields.forEach(function (sField) {
            var aControls = oItem.findAggregatedObjects(true, function (oControl) {
                if (!oControl.getBinding) {
                    return false;
                }

                var oBinding = oControl.getBinding("value");
                return !!(oBinding && oBinding.getPath && oBinding.getPath() === sField);
            });

            aControls.forEach(function (oControl) {
                if (oControl.setEditable) {
                    oControl.setEditable(false);
                }
            });
        });
    });
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


this._dialogMode = null;
this._extendSourceWarehouse = null;
this._extendSourceMaterial = null;
this._extendSourceMaterialDesc = null;


    if (!this.oDialog) {
        this.loadFragment({
            name: "bearingpoint.ewm.materialmaintenance.view.fragments.Create"
        }).then(function (oDialog) {

            that.oContextNewEntry = that.createNewEntry();
            that.getView().byId("sfCreate").setBindingContext(that.oContextNewEntry);

            
            that.getView().byId("entitled").setEditable(false);

            that.oDialog = oDialog;
            oDialog.open();
        });
    } else {
        this.oContextNewEntry = this.createNewEntry();
        this.getView().byId("sfCreate").setBindingContext(this.oContextNewEntry);

        
        this.getView().byId("entitled").setEditable(false);

        this.oDialog.open();
    }
},


onChangeWH: function () {
    var oModel = this.getView().getModel();
    var oWarehouseInput = this.getView().byId("warehouseNo");
    var oEntitledSmartField = this.getView().byId("entitled");

    var sWarehouseNo = oWarehouseInput && oWarehouseInput.getValue
        ? (oWarehouseInput.getValue() || "").trim()
        : "";

    if (!sWarehouseNo || !this.oContextNewEntry) {
        return;
    }

    // 1) write selected warehouse into dialog context
    oModel.setProperty("WarehouseNo", sWarehouseNo, this.oContextNewEntry);

    // 2) clear current entitled values before re-reading
    oModel.setProperty("Entitled", "", this.oContextNewEntry);
    oModel.setProperty("EntitledId", "", this.oContextNewEntry);
    oModel.checkUpdate(true);

    // 3) clear UI + temporarily lock field
    if (oEntitledSmartField) {
        oEntitledSmartField.setEditable(false);

        var aInnerBefore = oEntitledSmartField.getInnerControls && oEntitledSmartField.getInnerControls();
        var oInnerBefore = aInnerBefore && aInnerBefore.length ? aInnerBefore[0] : null;

        if (oInnerBefore && oInnerBefore.setValue) {
            oInnerBefore.setValue("");
        } else if (oEntitledSmartField.setValue) {
            oEntitledSmartField.setValue("");
        }

        oEntitledSmartField.setValueState("None");
        oEntitledSmartField.setValueStateText("");
    }

    console.log("Warehouse selected:", sWarehouseNo);

    // 4) read entitled values for selected warehouse
    oModel.read("/ZEWM_I_ENTITLEDVH", {
        filters: [
            new sap.ui.model.Filter(
                "Lgnum",   
                sap.ui.model.FilterOperator.EQ,
                sWarehouseNo
            )
        ],

        success: function (oData) {
            if (!oData || !oData.results || !oData.results.length) {
                console.log("No entitled found for warehouse:", sWarehouseNo);
                return;
            }

            var oResult = oData.results[0];
            console.log("ENTITLED VH first result:", oResult);

            //  robust mapping in case field names differ slightly
            var sEntitled =
                oResult.Entitled ||
                oResult.DefaultPtyEntitlId ||
                oResult.DefaultPtyEntitled ||
                oResult.Partner ||
                "";

            var sEntitledId =
                oResult.EntitledId ||
                oResult.DefaultPtyEntitlIdGuid ||
                oResult.PartnerGuid ||
                "";

            console.log("Resolved Entitled from backend:", sEntitled, sEntitledId);

            // 5) write to model
            oModel.setProperty("Entitled", sEntitled, this.oContextNewEntry);
            oModel.setProperty("EntitledId", sEntitledId, this.oContextNewEntry);
            oModel.checkUpdate(true);

            // 6) force UI update of the SmartField
            if (oEntitledSmartField) {
                var aInner = oEntitledSmartField.getInnerControls && oEntitledSmartField.getInnerControls();
                var oInnerInput = aInner && aInner.length ? aInner[0] : null;

                if (oInnerInput && oInnerInput.setValue) {
                    oInnerInput.setValue(sEntitled);
                } else if (oEntitledSmartField.setValue) {
                    oEntitledSmartField.setValue(sEntitled);
                }

                oEntitledSmartField.setEditable(true);
                oEntitledSmartField.setValueState("None");
                oEntitledSmartField.setValueStateText("");
            }
        }.bind(this),

        error: function (oError) {
            console.log("Failed to resolve Entitled from warehouse", oError);

            if (oEntitledSmartField) {
                oEntitledSmartField.setEditable(true);
                oEntitledSmartField.setValueState("Error");
                oEntitledSmartField.setValueStateText("No entitled found for selected warehouse");
            }
        }.bind(this)
    });
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
    delete oTemplate.DemandQuantity;

    var bIsExtend = this._dialogMode === "EXTEND";

    // remove the temporary dialog entry so it does not get submitted as a single fake create
    this.deleteModelEntry(this.oContextNewEntry);
    this.oContextNewEntry = null;

    var iCreated = 0;
    var iSkipped = 0;
    var bDuplicate = false;

    // --------------------------------------------
    // 3) Create one real entry per selected row
    // --------------------------------------------
    aSelectedItems.forEach(function (oItem) {
        var oSource = oItem.getBindingContext().getObject();

if (bIsExtend) {
    var sSourceWarehouse = oSource.WarehouseNo || "";
    var sTargetWarehouse = oTemplate.WarehouseNo || "";

    // Extend must create a different warehouse from source
    if (sSourceWarehouse && sTargetWarehouse && sSourceWarehouse === sTargetWarehouse) {
        iSkipped++;
        return;
    }
}


if (this._isExistingWarehouseCombination(
    oSource.MaterialId,
    oTemplate.WarehouseNo,
    oTemplate.Entitled
)) {
    bDuplicate = true;  
    iSkipped++;
    return;
}



var mProps = {
    MaterialId: oSource.MaterialId || "",
    MaterialNumber: oSource.MaterialNumber || "",
    MaterialDesc: oSource.MaterialDesc || "",

    WarehouseNo: oTemplate.WarehouseNo || "",
    Entitled: oTemplate.Entitled || "",

    PutawayControl: oTemplate.PutawayControl || "",

    StorSectInd: oTemplate.StorSectInd || "",

    StockRemovalCtrl: oTemplate.StockRemovalCtrl || "",

    BulkStorage: oTemplate.BulkStorage || "",

    ProcBlockProfile: oTemplate.ProcBlockProfile || "",

    CtrlIndicatorProcessType: oTemplate.CtrlIndicatorProcessType || "",

    ProductLoadCategory: oTemplate.ProductLoadCategory || "",

    CycleCountingIndicator: oTemplate.CycleCountingIndicator || "",

    MinShelfLife: this._hasMeaningfulMassChangeValue(oTemplate.MinShelfLife, "MinShelfLife")
        ? oTemplate.MinShelfLife
        : (oSource.MinShelfLife || 0),

    QuantityClassMerchandiseDistr: oTemplate.QuantityClassMerchandiseDistr || "",

    
PrefferedAltUoMforWarehouseOp:
    oTemplate.PrefferedAltUoMforWarehouseOp || "",


    QualityInspectionGroup: oTemplate.QualityInspectionGroup || "",

    StorageBinType:oTemplate.StorageBinType || "",

    StockDeterminationGroup: oTemplate.StockDeterminationGroup || "",

    
RelevanceForTwoStepPicking:
    oTemplate.RelevanceForTwoStepPicking || "",


StagingAreaDoorDetGroup: this._hasMeaningfulMassChangeValue(
    oTemplate.StagingAreaDoorDetGroup,
    "StagingAreaDoorDetGroup"
)
    ? oTemplate.StagingAreaDoorDetGroup
    : "",


    NumberOfSalesOrderItems: this._hasMeaningfulMassChangeValue(oTemplate.NumberOfSalesOrderItems, "NumberOfSalesOrderItems")
        ? oTemplate.NumberOfSalesOrderItems
        : (oSource.NumberOfSalesOrderItems || 0),

    RecommendedStorageQuantity: this._hasMeaningfulMassChangeValue(oTemplate.RecommendedStorageQuantity, "RecommendedStorageQuantity")
        ? oTemplate.RecommendedStorageQuantity
        : (oSource.RecommendedStorageQuantity || 0),

    DimentioRatio: this._hasMeaningfulMassChangeValue(oTemplate.DimentioRatio, "DimentioRatio")
        ? oTemplate.DimentioRatio
        : (oSource.DimentioRatio || 0),


WeightIndicator: this._hasMeaningfulMassChangeValue(oTemplate.WeightIndicator, "WeightIndicator")
    ? oTemplate.WeightIndicator
    : "",

VolumeIndicator: this._hasMeaningfulMassChangeValue(oTemplate.VolumeIndicator, "VolumeIndicator")
    ? oTemplate.VolumeIndicator
    : "",

LengthIndicator: this._hasMeaningfulMassChangeValue(oTemplate.LengthIndicator, "LengthIndicator")
    ? oTemplate.LengthIndicator
    : "",

WidthIndicator: this._hasMeaningfulMassChangeValue(oTemplate.WidthIndicator, "WidthIndicator")
    ? oTemplate.WidthIndicator
    : "",

HeightIndicator: this._hasMeaningfulMassChangeValue(oTemplate.HeightIndicator, "HeightIndicator")
    ? oTemplate.HeightIndicator
    : ""

};


//  ONLY send GUID/key fields if they really exist
if (oTemplate.EntitledId) {
    mProps.EntitledId = oTemplate.EntitledId;
}

if (oTemplate.Scuguid) {
    mProps.Scuguid = oTemplate.Scuguid;
} else if (oSource.Scuguid) {
    mProps.Scuguid = oSource.Scuguid;
}


// ONLY send supported fields
delete mProps.DemandQuantity;

oModel.createEntry("/ZEWM_C_MATERIAL", {
    properties: mProps
});

if (mProps.StagingAreaDoorDetGroup) {
    var oCfgStaging = this._getVhValidationConfig().find(function (c) {
        return c.fieldPath === "StagingAreaDoorDetGroup";
    });

    var oFilterInfo = this._buildDynamicVhFilters(
        mProps.WarehouseNo,
        mProps.StagingAreaDoorDetGroup,
        oCfgStaging
    );

    if (!oFilterInfo.ok) {
        iSkipped++;
        sap.m.MessageBox.error(
            "Could not validate StagArea/DoorDet.Grp. Check VH configuration."
        );
        return;
    }
}

console.log("CREATING FOR MATERIAL:", oSource.MaterialNumber, oSource.MaterialId);
        iCreated++;
    }.bind(this));

  
// --------------------------------------------
// 4) Nothing to create
// --------------------------------------------
if (iCreated === 0) {

    if (bDuplicate) {
        sap.m.MessageBox.warning(
            "Assignment already exists for the selected Warehouse / Entitled combination."
        );
    } else {
        sap.m.MessageToast.show(
            "No new assignments were created."
        );
    }

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

        oResponse.__batchResponses.forEach(function (oBatch) {

            if (oBatch.__changeResponses) {

                oBatch.__changeResponses.forEach(function (oChange) {

                    if (oChange.response) {
                        if (parseInt(oChange.response.statusCode, 10) >= 400) {
                            bHasError = true;
                        }
                    }

                    //  ALSO CHECK MESSAGE BODY
                    if (oChange.response && oChange.response.body) {
                        if (oChange.response.body.includes("error")) {
                            bHasError = true;
                        }
                    }

                });

            }

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

this._dialogMode = null;
this._extendSourceWarehouse = null;
this._extendSourceMaterial = null;
this._extendSourceMaterialDesc = null;


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
    this.onTableSelectionChange(); //  re-evaluate buttons correctly
}


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

    this._dialogMode = null;
    this._extendSourceWarehouse = null;
    this._extendSourceMaterial = null;
    this._extendSourceMaterialDesc = null;

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
                    StagingAreaDoorDetGroup: "",
                    NumberOfSalesOrderItems: val(oFirstItemContext.getProperty("NumberOfSalesOrderItems")),
                    RecommendedStorageQuantity: val(oFirstItemContext.getProperty("RecommendedStorageQuantity")),
                    DimentioRatio: val(oFirstItemContext.getProperty("DimentioRatio")),
                    WeightIndicator: "",
                    VolumeIndicator: "",
                    LengthIndicator: "",
                    WidthIndicator: "",
                    HeightIndicator: "",

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

                        setTimeout(function () {
                             that._wireMassChangeVH();
                            }, 300);

                    that.getView().byId("LineItemsSmartTable").setEditable(true);
                    that.onEditToggled();
                    oDialog.open();
                });
            
} else {
    that.oContextNewEntry = that._createMassChangeEntry();
    that.getView().byId("SF1").setBindingContext(that.oContextNewEntry);

    setTimeout(function () {
        that._wireMassChangeVH();
    }, 300);

    this.getView().byId("LineItemsSmartTable").setEditable(true);
    that.onEditToggled();
    this.oMassDialog.open();
}

        },


_wireMassChangeVH: function () {

    var oDialog = this.oMassDialog;
    if (!oDialog) {
        return;
    }

    var aCfg = this._getVhValidationConfig();

    aCfg.forEach(function (oCfg) {

        var oSmartField = this.getView().byId("SF1")
            .findAggregatedObjects(true, function (oControl) {

                if (!oControl.getBinding) {
                    return false;
                }

                var oBinding = oControl.getBinding("value");
                return !!(oBinding && oBinding.getPath && oBinding.getPath() === oCfg.fieldPath);
            })[0];

        if (!oSmartField) {
            return;
        }

        if (oSmartField.setShowValueHelp) {
            oSmartField.setShowValueHelp(true);
        }

        if (oSmartField.setEditable) {
            oSmartField.setEditable(true);
        }

        // OPTIONAL: attach validation if needed
        var fnHandler = function () {

            var oCtx = oSmartField.getBindingContext();
            var sWarehouseNo = oCtx ? oCtx.getProperty("WarehouseNo") : "";

            this._validateVHField(oSmartField, sWarehouseNo, oCfg);

        }.bind(this);

        if (oSmartField.attachChange) {
            oSmartField.attachChange(fnHandler);
        }

    }.bind(this));
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

      
applyMassChange: async function () {
    var oModel = this.getView().getModel();
    var aSelectedItems = this.table.getSelectedItems();
    var oDialogObject = oModel.getProperty(this.oContextNewEntry.sPath);

    // Qty requires UoM only if Qty is meaningfully filled (> 0)
    if (
        this._hasMeaningfulMassChangeValue(oDialogObject.RecommendedStorageQuantity, "RecommendedStorageQuantity") &&
        !this._hasMeaningfulMassChangeValue(oDialogObject.PrefferedAltUoMforWarehouseOp, "PrefferedAltUoMforWarehouseOp")
    ) {
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
    "HeightIndicator",
    "LengthIndicator"
];


    var aValidationPromises = [];

    aSelectedItems.forEach(function (oItem) {

        var oContext = oItem.getBindingContext();
        var sWarehouseNo = oContext.getProperty("WarehouseNo") || "";

        aMassChangeFields.forEach(function (sField) {

            if (!this._hasMeaningfulMassChangeValue(oDialogObject[sField], sField)) {
                return;
            }

            var vValue = oDialogObject[sField];

            var oInput = this._findInputInRowByFieldPath(oItem, sField);

            var oVhCfg = this._getVhValidationConfig().find(function (c) {
                return c.fieldPath === sField;
            });

            var oNumericCfg = this._getNumericValidationConfig().find(function (c) {
                return c.fieldPath === sField;
            });

            var pValidation = Promise.resolve().then(function () {

                // 1) First write Mass Change value into the row model
                oModel.setProperty(sField, vValue, oContext);
                oModel.checkUpdate(true);

                // 2) Sync UI input so validators read the new value
                if (oInput && oInput.setValue) {
                    oInput.setValue(
                        vValue === null || vValue === undefined ? "" : String(vValue)
                    );
                }

                // 3) VH field validation
                if (oVhCfg) {
                    return this._validateVHField(oInput, sWarehouseNo, oVhCfg);
                }

                // 4) Numeric field validation
                if (oNumericCfg) {
                    return this._validateNumericField(oInput, oContext, oNumericCfg);
                }

                // 5) Normal field
                return true;

            }.bind(this));

            aValidationPromises.push(pValidation);

        }.bind(this));

    }.bind(this));

    var aResults = await Promise.all(aValidationPromises);
    var bAllValid = aResults.every(Boolean);

    // Close Mass dialog after applying values, so user sees table errors inline
    this.deleteModelEntry(this.oContextNewEntry);
    this.oContextNewEntry = null;

    if (this.oMassDialog) {
        this.oMassDialog.close();
    }

    if (!bAllValid) {
        sap.m.MessageBox.error("Fix highlighted fields before saving.");
        return;
    }

    var bSuccess = await this.onSaveData();

    if (!bSuccess) {
        return;
    }
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
                    LengthIndicator: getCommonValue("LengthIndicator"),
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

    // SmartTable already switched mode at this point
    var bNowEditable = oSmartTable.getEditable();

    if (bNowEditable) {

        //  ENTERING EDIT MODE
        if (oEditToggleBtn) {
            oEditToggleBtn.setIcon("sap-icon://save");
        }

        

setTimeout(function () {
    this._wireGenericVHValidation();
    this._wireNumericValidation();

    this._applyEntitledReadOnly();
    
}.bind(this), 600);



    } else {

        //  SAVE triggered

        this.getView().getModel().checkUpdate(true);

        this.onSaveData().then(function (bSuccess) {

            if (bSuccess) {

                //  SmartTable ALREADY set editable=false
                // just sync icon + refresh

                if (oEditToggleBtn) {
                    oEditToggleBtn.setIcon("sap-icon://edit");
                }

                this._forceTableRefresh();

            } else {

                //  revert back to edit mode
                oSmartTable.setEditable(true);

                if (oEditToggleBtn) {
                    oEditToggleBtn.setIcon("sap-icon://save");
                }
            }

        }.bind(this));
    }
}


    });
});
