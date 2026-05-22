/*global QUnit*/

sap.ui.define([
	"bearingpointewm/material_maintenance/controller/Materials.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Materials Controller");

	QUnit.test("I should test the Materials controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
