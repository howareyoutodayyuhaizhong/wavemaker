/*
 * Copyright (C) 2008-2012 VMware, Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

dojo.provide("wm.studio.app.propertyEdit");

dojo.declare("wm.SetPropTask", null, {
    constructor: function(inComponent, inPropName, inOldValue, inNewValue, inIsStyle) {
        dojo.mixin(this, {
            component: inComponent,
            propName: inPropName,
            oldValue: inOldValue,
            newValue: inNewValue,
            isStyle: inIsStyle
        });
        this.hint = 'change "' + inPropName + '"';
        this.redo();
    },
    _do: function(inValue) {
        if (this.isStyle) {
            this.component.setStyle(this.propName, inValue);
        } else {
            this.component.setProp(this.propName, inValue);
        }
        //projectMgr.setDirtyComponents(true);
        if (studio.selected == this.component) {
            wm.onidle(studio.inspector, "reinspect");
        }
    },
    redo: function() {
        this._do(this.newValue);
        wm.undo.push(this);
    },
    undo: function() {
        this._do(this.oldValue instanceof wm.Component ? this.oldValue.getId() : this.oldValue);
    }
});

dojo.declare("wm.SetWireTask", null, {
    constructor: function(inComponent, inPropName, inOldValue, inNewValue, inIsExpression, skipValidation, skipParseExpression) {
        dojo.mixin(this, {
            component: inComponent,
            propName: inPropName,
            oldValue: inOldValue,
            newValue: inNewValue,
            isExpression: inIsExpression,
            skipValidation: skipValidation,
            skipParseExpression: skipParseExpression
        });
        this.hint = 'change "' + inPropName + '"';
        this.redo();
    },
    _do: function(inValue, type) {
        this.component.$.binding.removeWireByProp(this.propName);
        if (inValue || inValue === 0) {
            if (type == "expr") {
                if (!this.skipParseExpression) inValue = studio.inspector.parseExpressionForWire(inValue, this.skipValidation);
                this.component.$.binding.addWire("", this.propName, "", inValue);
            } else if (type == "source") {
                this.component.$.binding.addWire("", this.propName, inValue);
            } else {
                this.component.setValue(this.propName, this.oldValue.value); // non-bound value such as the caption before we replaced it with a binding
            }
        } else {
            this.component.setValue(this.propName, "");
        }

        var c = this.component;
        while (c.owner && !wm.isInstanceType(c.owner, [wm.Page, wm.Application]) && dojo.indexOf(studio.selected,c) == -1) {
            c = c.owner;
        }
        if (dojo.indexOf(studio.selected,c) != -1) {
            studio.inspector.reinspect();
        }
    },
    redo: function() {
        this._do(this.newValue, this.isExpression ? "expr" : "source");
        wm.undo.push(this);
    },
    undo: function() {
        if (this.oldValue.expression) {
            this._do(this.oldValue.expression, "expr");
        } else if (this.oldValue.source || !this.oldValue.value) {
            this._do(this.oldValue.source, "source");
        } else {
            this._do(this.oldValue.value, "value");
        }
    }
});

dojo.declare("wm.prop.SizeEditor", wm.AbstractEditor, {
    editorBorder: false,
    pxOnly: false,
    validationEnabled: function() {
        return false;
    },
    flow: function() {
        this.editor.flow();
    },
    _createEditor: function(inNode) {
        this.editor = new wm.Panel({
            layoutKind: "left-to-right",
            owner: this,
            parent: this,
            width: "100%",
            height: "100%",
            name: "editor",
            readonly: this.readonly
        });
        this.numberEditor = new wm.Text({
            owner: this,
            regExp: "^\\d*(%|px|)",
            parent: this.editor,
            width: "100%",
            name: "numberEditor",
            minWidth: 30,
            padding: "0,1,0,0",
            readonly: this.readonly
        });
        this.typeEditor = new wm.SelectMenu({
            owner: this,
            parent: this.editor,
            name: "typeEditor",
            options: "px,%",
            dataField: "dataValue",
            displayField: "dataValue",
            width: "50px",
            padding: "0",
            readonly: this.readonly
        });
        if (this.pxOnly) {
            this.typeEditor.setReadonly(true);
            this.typeEditor.setDataValue("px");
        }
        this.numberEditor.connect(this.numberEditor, "onchange", this, "numberChanged");
        this.typeEditor.connect(this.typeEditor, "onchange", this, "changed");
        if (this.disabled) this.editor.setDisabled(true);
        return this.editor;
    },
    numberChanged: function() {
        var displayValue = this.numberEditor.getDisplayValue();
        if (this.pxOnly) {
            displayValue = parseInt(displayValue);
            this.changed();
        } else if (displayValue.match(/\%$/)) {
            this.numberEditor.setDataValue(displayValue.replace(/\%$/, ""));
            this.typeEditor.setDataValue("%");
        } else if (displayValue.match(/px$/)) {
            this.numberEditor.setDataValue(displayValue.replace(/px$/, ""));
            this.typeEditor.setDataValue("px");
        } else {
            this.changed();
        }
    },
    getEditorValue: function() {
        return this.numberEditor.getDataValue() + this.typeEditor.getDataValue();
    },
    setEditorValue: function(inValue) {
        var result = String(inValue).match(/^(\d+)(.*)$/);
        if (result) {
            this.numberEditor.setDataValue(result[1]);
            this.typeEditor.setDataValue(result[2] || "px");
        } else {
            this.numberEditor.setDataValue(100);
            this.typeEditor.setDataValue("px");
        }
    },
    setDisabled: function(inDisabled) {
        this.inherited(arguments);
        if (this.editor) {
            this.editor.setDisabled(this.disabled);
        }
    }
});


// user passes in an options array (not a comma separated list) and a values array; getDataValue returns values[i]
// simple way to have separate display/datavalues without passing in a wm.variable
dojo.declare("wm.prop.SelectMenu", wm.SelectMenu, {
    dataField: "dataValue",
    displayField: "dataValue",
    values: null,
    postInit: function() {
        this.inherited(arguments);
        this.refreshOptions();
    },
    getDataValue: function() {
        if (!this.values) return this.inherited(arguments);
        var display = this.getDisplayValue();
        for (var i = 0; i < this.options.length; i++) {
            if (display == this.options[i]) {
                return this.values[i];
            }
        }
        if (!this.restrictValues) return display;
    },
    setEditorValue: function(inValue) {
        if (!this.values) return this.inherited(arguments);
        for (var i = 0; i < this.values.length; i++) {
            if (inValue == this.values[i]) {
                return this.inherited(arguments, [this.options[i]]);
            }
        }
        if (!this.restrictValues) return this.inherited(arguments);
    },
    refreshOptions: function() {
        this.updateOptions();
        this.setOptions(this.options);
    },
    updateOptions: function() {}
});

dojo.declare("wm.prop.CheckboxSet", wm.CheckboxSet, {
    dataField: "dataValue",
    displayField: "dataValue",
    postInit: function() {
        this.inherited(arguments);
        this.refreshOptions();
    },
    refreshOptions: function() {
        this.updateOptions();
        this.setOptions(this.options);
    },
    updateOptions: function() {}
});

wm.getPageList = function(currentPageOK){
        var pages = [""].concat(studio.project.getPageList()), current = studio.page.declaredClass;
        if (!currentPageOK)
            return dojo.filter(pages, function(p) {
                return (p != current);
            });
        else
            return pages;
}

dojo.declare("wm.prop.PagesSelect", wm.prop.SelectMenu, {
    newPage: true,
    currentPageOK: false,
    updateOptions: function() {
        this.inherited(arguments);
        var pagelist = wm.getPageList(this.currentPageOK);
        if (this.newPage) pagelist.push(studio.getDictionaryItem("wm.PageContainer.NEW_PAGE_OPTION"));
        this.setOptions(pagelist);
        var dataValue = this.getDataValue() || "";
        var pageName = this.inspected.getValue(this.propDef.name) || "";
        if (!dataValue && pageName) {
            this.inspected.setValue(this.propDef.name, "");
        }
    }
});


dojo.declare("wm.prop.DataSetSelect", wm.prop.SelectMenu, {
    matchComponentType: false,
    dataField: "dataValue",
    displayField: "dataValue",
    allowAllTypes: true,
    listMatch: true, /* True: only match lists; False: only match non-lists; undefined: match all */
    createWire: true,
    widgetDataSets: false,
    allowNone: true,
    servicesOnly: false,
    liveServicesOnly: false,

    noForms: false,
    showInputs: false,
    updateOptions: function() {
        this.inherited(arguments);
        var matchType = "";
        if (this.matchComponentType) {
            var value = this.inspected.getValue(this.propDef.fullName);
            if (value) matchType = value.type;
        }
        var sp = studio.page;
        var r = this.getDataSets([sp, sp.app], matchType);
        /*
    if (this.showInputs) {
        var serviceVars = wm.listComponents([sp,sp.app], wm.ServiceVariable, true);
        for (var i = 0; i < serviceVars.length; i++) {
        if (!matchType || matchType == serviceVars[i].type) {
            r.push(serviceVars[i].name + ".input");
        }
        }
    }
    */
        if (this.widgetDataSets) wm.forEachWidget(sp.root, dojo.hitch(this, function(w) {
            if (!(w instanceof wm.PageContainer) && w !== this && !(wm.isInstanceType(w, wm.LiveFormBase)) && !(wm.isInstanceType(w, wm.AbstractEditor) && w.formField)) {
                var results = this.getDataSets([w], matchType);
                dojo.forEach(results, function(result) {
                    if (dojo.indexOf(r, result) == -1) r.push(result);
                });
            }
        }), true);

        r = r.sort(); /* If called from something other than the property panel, then this.inspected may not exist */
        if (this.inspected) {
            wm.Array.removeElement(r, this.inspected.getId());
        }
        if (!wm.Array.equals(this.options,r)) {
            this.setOptions(r);
        }
    },

    getDataSets: function(inOwners, matchType) {
        return wm.listMatchingComponentIds(inOwners, dojo.hitch(this, function(c) {
        if (c instanceof wm.Property) return false;

        // if its owner is not a page, then the owner is something like DojoGrid; in other words,
        // c might be dojogrid1.dataSet.  If the owner is the thing being inspected (dojogrid1),
        // then don't include its subcomponents as bindable.
        if (c.owner instanceof wm.Page == false && c.owner == this.inspected) return false;

        if (!c.name || c.name.indexOf("_") === 0) return false;

        if (c.owner instanceof wm.LiveVariable && (c.name == "filter" || c.name == "sourceData" || c.name == "input"))
            return false;

        if (matchType) {
            return matchType == c.type;
        }

            if (!this.allowAllTypes && !wm.typeManager.isStructuredType(c.type)) return false;

            if (c instanceof wm.LiveVariable) return true; // always accept any LiveVariable no matter who owns it


            if (c instanceof wm.Variable && !this.servicesOnly || c instanceof wm.ServiceVariable) {
                var typeDef = wm.typeManager.getType(c.type);

                /* Handle liveServiceOnly */
                if (this.liveServicesOnly) {
                if (!typeDef || !typeDef.liveService) {
                    return false;
                }
                }

                /* Handle noForms */
                if (this.noForms && (wm.LiveFormBase && wm.isInstanceType(c.owner, [wm.LiveFormBase,wm.DataForm]))) {
                return false;
                }

                /* Handle listMatch */
                if (this.listMatch !== undefined) {
                if (this.listMatch != wm.fire(c, "isListBindable")) {
                    return false;
                }
                }

                return true;
            }
        }),true,true);
    }
});


dojo.declare("wm.prop.FieldSelect", wm.prop.SelectMenu, {
    dataField: "dataValue",
    displayField: "dataValue",
    dataSetProp: "dataSet",
    insepected: null,
    allowNone: true,
    emptyLabel: "",
    allowRelatedField: false,
    updateOptions: function() {
        this.inherited(arguments);
        var ds = this.inspected.getProp(this.dataSetProp) || this.inspected[this.dataSetProp];
        var options;
        if (!ds && this.inspected.formField) {
            var form = this.inspected.getParentForm();
            if (form) {
                var schema = form.dataSet._dataSchema[this.inspected.formField]; // doesn't work if formField is x.y, only x
                if (schema) {
                    var type = schema.type;
                }
                if (type) {
                    var typeDef = wm.typeManager.getType(type);
                }
                if (typeDef) {
                    options = wm.typeManager.getSimplePropNames(typeDef.fields);
                }
            }
        }
        if (!options) {
            if (ds) {
                options = wm.typeManager.getSimplePropNames(ds._dataSchema);
            } else {
                options = [];
            }
        }
        if (this.allowRelatedField) {
            if (ds instanceof wm.LiveVariable) {
                var liveViewFields = ds.liveView.related;
                dojo.forEach(liveViewFields, function(field) {
                    var moreoptions = wm.typeManager.getSimplePropNames(wm.typeManager.getType(ds._dataSchema[field].type).fields);
                    dojo.forEach(moreoptions, function(o) {options.push(field + "." + o);});
                });
            } else {
                var moreoptions = wm.typeManager.getStructuredPropNames(ds._dataSchema);
                dojo.forEach(moreoptions, function(o) {options.push(o);});
            }
        }

        if (this.emptyLabel) {
            this.allowNone = false;
            options.unshift(this.emptyLabel);
        }
        if (!wm.Array.equals(this.options,options)) {
            this.setOptions(options);
        }

    },
    setEditorValue: function(inValue) {
        if (!inValue && this.emptyLabel) {
            this.inherited(arguments, [this.emptyLabel]);
        } else {
            this.inherited(arguments);
        }
    },
    setInitialValue: function() {
        this.beginEditUpdate();
        this.setEditorValue(this.dataValue);
        this.endEditUpdate();
    }

});
dojo.declare("wm.prop.FieldList", wm.prop.CheckboxSet, {
    dataField: "dataValue",
    displayField: "dataValue",
    dataSetProp: "dataSet",
    insepected: null,
    allowNone: true,
    emptyLabel: "",
    updateOptions: function() {
        this.inherited(arguments);
        var ds = this.inspected.getProp(this.dataSetProp) || this.inspected[this.dataSetProp];
        var options;
        if (ds) {
            options = wm.typeManager.getSimplePropNames(ds._dataSchema);
        } else {
            options = [];
        }
        if (this.emptyLabel) {
            this.allowNone = false;
            options.unshift(this.emptyLabel);
        }
        if (!wm.Array.equals(this.options,options)) {
            this.setOptions(options);
        }
    },
    setEditorValue: function(inValue) {
        if (!inValue && this.emptyLabel) {
            this.inherited(arguments, [this.emptyLabel]);
        } else {
            this.inherited(arguments);
        }
    },
    setInitialValue: function() {
        this.beginEditUpdate();
        this.setEditorValue(this.dataValue);
        this.endEditUpdate();
    },
    reinspect: function() {
        this.updateOptions();
        return true;
    }

});


dojo.declare("wm.prop.FormFieldSelect", wm.prop.SelectMenu, {
    dataField: "dataValue",
    displayField: "dataValue",
    relatedFields: false,
    insepected: null,
    allowNone: false,
    oneToMany: undefined,
    liveFields: true,
    updateOptions: function() {
    this.inherited(arguments);
    var f = this.inspected.getParentForm();
    var ds;
    var type;

    if (wm.isInstanceType(f, wm.ServiceInputForm)) {
        ds = f.serviceVariable.input;
    } else if (f && f.dataSet && wm.typeManager.getType(f.dataSet.type)) {
        ds = f && f.dataSet;
    }
    var options;
    if (ds) {
        options = ds && ds.type ? this.inspected.getSchemaOptions && this.inspected.getSchemaOptions(ds._dataSchema) || this.getSchemaOptions(ds._dataSchema) : [""];
    } else if (f && f.type) {
        var type = wm.typeManager.getType(f.type);
        options = type ? this.getSchemaOptions(type.fields) : [""];
        } else {
        options = [];
        }
        if (!wm.Array.equals(this.options,options)) {
            this.setOptions(options);
        }
    },
    getSchemaOptions: function(inSchema) {
        var result =  wm.typeManager[this.relatedFields ? "getStructuredPropNames" : "getSimplePropNames"](inSchema, true);
        if (this.oneToMany === true || this.oneToMany === false) {
        var f = this.inspected.getParentForm();
        var dataSet;
        if (wm.isInstanceType(f, wm.ServiceInputForm)) {
            dataSet = f.serviceVariable.input;
        } else if (f && f.dataSet && wm.typeManager.getType(f.dataSet.type)) {
            dataSet = f && f.dataSet;
        }
        var fields = dataSet._dataSchema;
        var newresults = [];
        for (var i = 0; i < result.length; i++) {
            if (fields[result[i]].isList && this.oneToMany || !fields[result[i]].isList && !this.oneToMany) {
            newresults.push(result[i]);
            }
        }
        result = newresults;
        }

        if (this.liveTypes != true) {
        var f = this.inspected.getParentForm();
        var dataSet;
        if (wm.isInstanceType(f, wm.ServiceInputForm)) {
            dataSet = f.serviceVariable.input;
        } else if (f && f.dataSet && wm.typeManager.getType(f.dataSet.type)) {
            dataSet = f && f.dataSet;
        }
        var fields = dataSet._dataSchema;
        var newresults = [];
        for (var i = 0; i < result.length; i++) {
            var type = fields[result[i]].type;
            var typeDef = wm.typeManager.getType(type);
            if (!typeDef || !typeDef.liveService || this.relatedFields) {
            newresults.push(result[i]);
            }
        }
        result = newresults;
    }

        result.unshift("");
        return result;
    }
});



dojo.declare("wm.prop.ImageListSelect", wm.prop.SelectMenu, {
    dataField: "dataValue",
    displayField: "dataValue",
    allowNone: true,
    updateOptions: function() {
        this.inherited(arguments);
        this.setOptions(studio.getImageLists());
    }
});

dojo.declare("wm.prop.WidgetSelect", wm.prop.SelectMenu, {
    inspectedChildrenOnly: false,
    dataField: "dataValue",
    displayField: "dataValue",
    allowNone: true,
    widgetType: null,
    excludeType: null,
    useOwner: null,
    updateOptions: function() {
        if (this.widgetType && typeof this.widgetType == "string") this.widgetType = dojo.getObject(this.widgetType);
        if (this.excludeType && typeof this.excludeType == "string") this.excludeType = dojo.getObject(this.excludeType);

        this.inherited(arguments);

        var components = wm.listComponents([studio.getValueById(this.useOwner) || this.inspected.owner], this.widgetType);
        var result = [];
        if (this.excludeType) {
            for (var i = 0; i < components.length; i++) {
                if (wm.isInstanceType(components[i], this.excludeType) == false) {
                    result.push(components[i]);
                }
            }
        } else {
            result = components;
        }
        if (this.inspectedChildrenOnly) {
            components = result;
            result = [];
            for (var i = 0; i < components.length; i++) {
                if (components[i].isAncestor(this.inspected)) {
                    result.push(components[i]);
                }
            }
        }
        var ids = [];
        for (var i = 0; i < result.length; i++) {
            ids.push(result[i].getId());
        }
        this.setOptions(ids);
    }
});

dojo.declare("wm.prop.MultiWidgetSelect", wm.ListSet, {
    forceCaptionPositionTop: true,
    renderVisibleRowsOnly: false,
    inspectedChildrenOnly: false,
    dataField: "dataValue",
    displayField: "dataValue",
    selectionMode: "checkbox",
    height: "300px",
    widgetType: null,
    excludeType: null,
    useOwner: null,
    init: function() {
        this.inherited(arguments);
        dojo.addClass(this.domNode, "StudioList");
    },
    createEditor: function() {
        this.inherited(arguments);
        if (this.widgetType && typeof this.widgetType == "string") this.widgetType = dojo.getObject(this.widgetType);
        if (this.excludeType && typeof this.excludeType == "string") this.excludeType = dojo.getObject(this.excludeType);

        var components = wm.listComponents([studio.getValueById(this.useOwner) || this.inspected.owner], this.widgetType);
        var result = [];
        if (this.excludeType) {
            for (var i = 0; i < components.length; i++) {
                if (wm.isInstanceType(components[i], this.excludeType) == false) {
                    result.push(components[i]);
                }
            }
        } else {
            result = components;
        }
        if (this.inspectedChildrenOnly) {
            components = result;
            result = [];
            for (var i = 0; i < components.length; i++) {
                if (components[i].isAncestor(this.inspected)) {
                    result.push(components[i]);
                }
            }
        }
        var ids = [];
        for (var i = 0; i < result.length; i++) {
            ids.push(result[i].getId());
        }

        this.setOptions(ids);

    }
});
dojo.declare("wm.prop.DataTypeSelect", wm.prop.SelectMenu, {
    useLiterals: false,
    liveTypes: false,
    includeLiveViews: false,
    addNewOption: false,
    updateOptions: function() {
        this.inherited(arguments);
        if (this.useLiterals) {
            this.options = ["", "String", "Number", "Date", "Boolean"];
            this.values = ["", "String", "Number", "Date", "Boolean"];
        } else {
            this.options = [""];
            this.values = [""];
        }
        if (this.addNewOption) {
            wm.Array.insertElementAt(this.options, "New Type", 1);
            wm.Array.insertElementAt(this.values, "New Type", 1);
        }
        if (this.includeLiveViews) {
            this.options = this.options.concat(this.getLiveViews());
            this.values = this.values.concat(this.getLiveViews());
        }
        this.addOptionValues(this.getDataTypes(), true);
    },
    getLiveViews: function() {
        var
        views = wm.listComponents([studio.application], wm.LiveView),
            lv = [];
        wm.forEach(views, dojo.hitch(this, function(v) {
            var dt = v.dataType || "",
                k = dt ? " (" + dt.split('.').pop() + ")" : "";
            lv.push(v.getId());

        }));
        return lv;
    },
    addOptionValues: function(inOptionValues, inSort) {
        this.sort = inSort;
        if (inSort) inOptionValues.sort(function(a, b) {
            return wm.data.compare(a.option, b.option);
        });
        this.options = (this.options || []).concat(dojo.map(inOptionValues, function(d) {
            return d.option;
        }));
        this.values = (this.values || []).concat(dojo.map(inOptionValues, function(d) {
            return d.value;
        }));
    },
    getDataTypes: function() {
        var
        types = this.liveTypes ? wm.typeManager.getLiveServiceTypes() : wm.typeManager.getPublicTypes(),
            dt = [];
        for (var i in types) {
            if (wm.defaultTypes[i]) {
                //i = wm.defaultTypes[i].fields.dataValue.type;
                dt.push({
                    option: i,
                    value: i
                });
            } else {
                dt.push({
                    option: wm.getFriendlyTypeName(i),
                    value: i
                });
            }
        }
        return dt;
    }
});


dojo.declare("wm.prop.EventEditorSet", wm.Container, {
    noBindColumn: true,
    noHelpButton: true,
    inspected: null,
    verticalAlign: "top",
    horizontalAlign: "left",
    borderColor: "#3F3F3F",
    margin: "0,0,4,0",
    init: function() {
        this.inherited(arguments);
        this.setLayoutKind("top-to-bottom");
        var topPanel = new wm.Panel({
            owner: this,
            parent: this,
            width: "100%",
            height: "28px",
            layoutKind: "left-to-right",
            verticalAlign: "top",
            horizontalAlign: "left"
        });
        this.title = new wm.Label({
            owner: this,
            name: "title",
            parent: topPanel,
            width: "100%",
            height: "20px",
            caption: this.propName
        });
        this.plusButton = new wm.Label({
            owner: this,
            parent: topPanel,
            _classes: {
                domNode: ["wmPlusToolButton"]
            },
            caption: "+",
            showing: this.inspected instanceof wm.Page == false && this.inspected instanceof wm.Application == false,
            align: "center",
            width: "20px",
            height: "18px",
            padding: "0",
            showing: this.inspected instanceof wm.Application == false,
            onclick: dojo.hitch(this, function() {
                var index = this.editors[this.editors.length - 1].propertyNumber + 1;
                this.addEditor(index, "-");
                this.inspected.eventBindings[this.propName + index] = "-";
                this.inspected[this.propName + index] = function() {};
                this.panel.setHeight(this.panel.getPreferredFitToContentHeight() + "px");
                this.setHeight(this.getPreferredFitToContentHeight() + "px");
                this.parent.setHeight(this.parent.getPreferredFitToContentHeight() + "px");
            })
        });
        this.helpButton = wm.Label({
            owner: this,
            caption: "",
            parent: topPanel,
            width: "20px",
            height: "20px",
            margin: "0",
            onclick: dojo.hitch(this, function() {
                studio.helpPopup = studio.inspector.getHelpDialog();
                studio.inspector.beginHelp(this.propDef.name, this.domNode, this.inspected.declaredClass);
            }),
            _classes: {
                domNode: ["EditorHelpIcon"]
            }
        });

        this.panel = new wm.Panel({
            owner: this,
            parent: this,
            width: "100%",
            height: "28px",
            layoutKind: "top-to-bottom",
            verticalAlign: "top",
            horizontalAlign: "left"
        });
        this.addEditors();
    },
    addEditors: function() {
        dojo.toggleClass(this.title.domNode, "isPublishedProp", this.propDef.isPublished ? true : false);
        dojo.toggleClass(this.title.domNode, "isAdvancedProp", this.propDef.advanced ? true : false);
        this.editors = [];
        var value;
        if (this.inspected instanceof wm.Application == false) {
            value = this.inspected.getProp(this.propName);
        } else {
            studio.generateAppSourceHtml();
            var text = studio.appsourceHtml.getHtml();
            text = text.replace(/.*?\>/, "").replace(/\<\/pre\>$/, "");
            delete window[studio.project.projectName];
            try {
                eval(text);
                eval(studio.appsourceEditor.getDataValue());
            } catch (e) {}
            var ctor = dojo.getObject(studio.project.projectName);
            value = (ctor && ctor.prototype[this.propName] && ctor.prototype[this.propName] != wm.Application.prototype[this.propName]) ? this.propName : "";
        }


        this.addEditor(0, value);
        for (var i = 1; i < 20; i++) {
            if (this.inspected.getProp(this.propName + i)) {
                this.addEditor(i, this.inspected.getProp(this.propName + i));
            }
        }
        this.panel.setHeight(this.panel.getPreferredFitToContentHeight() + "px");
        this.setHeight(this.getPreferredFitToContentHeight() + "px");
        this.parent.setHeight(this.parent.getPreferredFitToContentHeight() + "px");
    },
    addEditor: function(inIndex, inValue) {
        var propertyName = this.propName + (inIndex == 0 ? "" : inIndex);
        this.editors.push(new wm.prop.EventEditor({
            owner: this,
            parent: this.panel,
            name: "propEdit_" + this.propName + "_" + inIndex,
            propName: propertyName,
            propertyNumber: parseInt(inIndex),
            width: "100%",
            height: studio.inspector.defaultEditorHeight,
            captionSize: inIndex > 0 ? "60px" : "0px",
            caption: inIndex > 0 ? "And then" : "",
            captionPosition: "left",
            captionAlign: "left",
            dataValue: inValue,
            inspected: this.inspected
        }));
    },

    /* Needed when we have an eventHandler that is a required Property, such as for wm.Button; if one onclick editor changes, the
     * other onclick editor must update
     */
    reinspect: function() {

        this.panel.removeAllControls();
        this.addEditors();
        return true;
    }
});
dojo.declare("wm.prop.EventDijit", [dijit.form.ValidationTextBox, dijit._HasDropDown], {
    baseClass: "dijitTextBox dijitComboBox dijitDateTextBox",
    popupClass: "wm.DojoMenu",
    hasDownArrow: true,
    openOnClick: true,
    templateString: dojo.cache("dijit.form", "templates/DropDownBox.html"),
    currentIndex: 0,
    postMixInProperties: function() {
        this.inherited(arguments);
        this._messages = dojo.i18n.getLocalization("dijit.form", "ComboBox", this.lang);
    },

    openDropDown: function(callback) {
        if (!wm.prop.EventDijit.menu) {
            wm.prop.EventDijit.menu = new wm.PopupMenu({
                owner: studio,
                _classes: {
                    domNode: ["wmStudioEventMenu"]
                },
                name: "EventPicker"
            });
        }
        //wm.prop.EventDijit.menu.setFullStructure([{"label":"File","children":[{"label":"Save"},{"label":"Close"}]},{"label":"Edit","children":[{"label":"Cut"},{"label":"Copy"},{"label":"Paste"}]},{"label":"Help"}]);
        this.structure = this.owner.getFullStructure();
        wm.prop.EventDijit.menu.setFullStructure(this.structure);
        wm.prop.EventDijit.menu.renderDojoObj();
        var menuItems = wm.prop.EventDijit.menu._dijitHash;
        /*
    for (var itemName in menuItems) {
        if (itemName.indexOf(" - ") !=0 && !itemName.match(/\:$/) && itemName.indexOf("-- ") != 0) {
        dojo.addClass(menuItems[itemName].domNode, "studioIndentOption");
        }
    }
    */
        wm.prop.EventDijit.menu.update(null, this.owner, true);
    }
    /*
    generateIndex: function(currentIndex) {
    this.currentIndex = currentIndex;
    var start = currentIndex;

    var struct = [];
    if (currentIndex) {
            struct.push({label: "-- " + this._messages["previousMessage"] + " --", onClick: dojo.hitch(this, function() {
        this.generateIndex(0);
        })});
    }
    for (var i = currentIndex; i < this.structure.length; i++) {
        if (this.structure[i].pageBreak)
        break;
        struct.push(this.structure[i]);
    }
    if (i < this.structure.length) {
            struct.push({label: "-- " + this._messages["nextMessage"] + " --", onClick: dojo.hitch(this, function() {
        this.generateIndex(i+1);
        })});
    }
    wm.prop.EventDijit.menu.setFullStructure(struct);
    wm.prop.EventDijit.menu.renderDojoObj();
    var menuItems = wm.prop.EventDijit.menu._dijitHash;
    for (var itemName in menuItems) {
        if (itemName.indexOf(" - ") !=0 && !itemName.match(/\:$/) && itemName.indexOf("-- ") != 0) {
        dojo.addClass(menuItems[itemName].domNode, "studioIndentOption");
        }
    }
    wm.prop.EventDijit.menu.update(null, this.owner, true);
    }
    */
});
dojo.declare("wm.prop.EventEditor", wm.AbstractEditor, {
    /*indentField: "indent",
    restrictValues: false,
    displayField: "name",
    dataField: "dataValue",*/
    setEditorValue: function(inValue) {
    if (this.isDestroyed) {
        this.dataValue = inValue;
        this.onchange();
    } else {
        this.inherited(arguments);
    }
    },
    _createEditor: function(inNode, inProps) {
    var e =  new wm.prop.EventDijit(this.getEditorProps(inNode, inProps));
    e.owner = this;
    return e;
    },
    constructor: function() {
    if (!wm.prop.EventEditor.eventActions) {
        wm.prop.EventEditor.eventActions =  {
        noEvent: {caption: studio.getDictionaryItem("wm.EventEditor.NO_EVENTS")},
        jsFunc: {caption: studio.getDictionaryItem("wm.EventEditor.NEW_JAVASCRIPT")},
        //jsSharedFunc: {caption: studio.getDictionaryItem("wm.EventEditor.NEW_JAVASCRIPT_SHARED")},
        newService: {caption: studio.getDictionaryItem("wm.EventEditor.NEW_SERVICE")},
        newLiveVar: {caption: studio.getDictionaryItem("wm.EventEditor.NEW_LIVEVAR")},
        newNavigation: {caption: studio.getDictionaryItem("wm.EventEditor.NEW_NAVIGATION")},
        newNotification: {caption: studio.getDictionaryItem("wm.EventEditor.NEW_NOTIFICATION")},
        serviceVariables: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_SERVICE"), list: "serviceVariable"},
        navigations: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_NAVIGATION"), list: "navigationCall"},
        notifications: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_NOTIFICATION"), list: "notificationCall"},
        //existingCalls: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_SHARED_JAVASCRIPT"), list: "sharedEventHandlers"},
        dialogs: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_DIALOGS"), list: "dialogs"},
        layers: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_LAYERS"), list: "layers"},
        mobileFolding: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_MOBILE_FOLDING"), list: "mobileFolding"},
        liveForms: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_LIVEFORMS"), list: "liveForms"},
        dataForms: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_DATAFORMS"), list: "dataForms"},
        dashboards: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_DASHBOARDS"), list: "dashboards"},
        timers: {caption: studio.getDictionaryItem("wm.EventEditor.LIST_TIMERS"), list: "timers"}
        };
    }
    },
    isEventAction: function(inValue) {
    return Boolean(wm.prop.EventEditor.eventActions[inValue]);
    },
    //FIXME: cache this
/*
    postInit: function() {
    this.inherited(arguments);
    this._inPostInit = true;
    var sc = wm.listComponents([studio.application, studio.page], wm.ServiceVariable).sort();
    var lightboxList = wm.listComponents([studio.application, studio.page], wm.DojoLightbox);
    var nc = wm.listComponents([studio.application, studio.page], wm.NavigationCall).sort();
    var sharedEventHandlers = eventList(this.inspected.getSharedEventLookupName(this.propName), wm.isInstanceType(studio.selected.owner, wm.Application) ? studio.appsourceEditor : studio.editArea);
    var dialogList = wm.listComponents([studio.application, studio.page], wm.Dialog);
    dialogList = dialogList.concat(wm.listComponents([studio.application, studio.page], wm.DojoLightbox));
    dialogList = dialogList.concat(wm.listComponents([studio.application, studio.page], wm.PopupMenu));
    dialogList = dialogList.sort();
    if (wm.PopupMenu && this.inspected instanceof wm.PopupMenu)
        wm.Array.removeElement(dialogList, this.inspected);

    //var layerList = wm.listComponents([studio.page], wm.Layer);
    var layerList = [];
    var mobileFoldingList = [];
    wm.forEachWidget(studio.page.root, function(w) {
        if (w instanceof wm.Layer)
        layerList.push(w);
        else if (w.mobileFolding)
        mobileFoldingList.push(w);
    }, false);
    layerList = layerList.sort();
    mobileFoldingList = mobileFoldingList.sort();



    var dashboardList = wm.listComponents([studio.application, studio.page], wm.Dashboard).sort();
    //var lf = wm.listComponents([studio.application, studio.page], wm.LiveForm);
    var timers = wm.listComponents([studio.application, studio.page], wm.Timer).sort();
    var items=[];
    var eventSchema = this.inspected.schema[this.propName];

    wm.forEachProperty(wm.prop.EventEditor.eventActions, function(o, name) {
        var n = o.caption, l = o.list;
        if (l) {
        var a;
        switch(l) {
        case "navigationCall":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "navigation") == -1) return;
            a = nc;
            break;
        case "serviceVariable":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "service") == -1) return;
            a = sc;
            break;
        case "sharedEventHandlers":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "js") == -1) return;
            a = sharedEventHandlers;
            break;
        case "dialogs":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "dialog") == -1) return;
            a = dialogList;
            break;
        case "layers":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "layer") == -1) return;
            a = layerList;
            break;

        case "mobileFolding":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "mobileFolding") == -1) return;
            a = mobileFoldingList;
            break;

        case "lightboxes":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "lightbox") == -1) return;
            a = lightboxList;
            break;
        case "liveForms":
            / *
              if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "liveForm") == -1) return;
              a = lf;
              break;
            * /
        case "dashboards":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "dashboards") == -1) return;
            a = dashboardList;
            break;
        case "timers":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "timers") == -1) return;
            a = timers;
            break;
        }

        if (a && a.length) {
            items.push({name: n, dataValue: n});
            dojo.forEach(a, function(obj) {
            var aa;
            if (obj instanceof wm.Layer) {
                aa = obj.getRuntimeId().replace(/^studio\.wip\./,"");
            } else if (obj instanceof wm.Component) {
                aa = obj.getId();
            } else {
                aa = obj;
            }
            if (obj instanceof wm.Dialog){
                items.push({name: aa + '.show', dataValue: aa + '.show', indent: 1});
                items.push({name: aa + '.hide', dataValue: aa + '.hide', indent: 1});
            } else if (l == "layers" && obj.mobileFolding && obj instanceof wm.Layer == false) {
                items.push({name: "mobile folding: " + aa, dataValue: aa, indent: 1});
                        } else {
                items.push({name: aa, dataValue: aa, indent:1});
                        }
            / *
              if (obj instanceof wm.LiveForm){
              items.push({name: aa + '.beginDataInsert', dataValue: aa + '.beginDataInsert'});
              items.push({name: aa + '.saveData', dataValue: aa + '.saveData'});
              items.push({name: aa + '.beginDataUpdate', dataValue: aa + '.beginDataUpdate'});
              //items.push({name: aa + '.updateData', dataValue: aa + '.updateData'});
              items.push({name: aa + '.cancelEdit', dataValue: aa + '.cancelEdit'});
              items.push({name: aa + '.deleteData', dataValue: aa + '.deleteData'});
              } else if (obj instanceof wm.Timer){
              items.push({name: aa + ".startTimer", dataValue: aa + ".startTimer"});
              items.push({name: aa + ".stopTimer", dataValue: aa + ".stopTimer"});
              } else {
              items.push({name: aa, dataValue: aa});
              }
            * /
            })
        }
        } else {
        if (eventSchema && eventSchema.events)
            switch(name) {
            case "noEvent":
            if ( dojo.indexOf(eventSchema.events, "disableNoEvent") != -1) return;
            case "jsFunc":
            if (dojo.indexOf(eventSchema.events, "js") == -1) return;
            break;
            case "jsSharedFunc":
            if (dojo.indexOf(eventSchema.events, "sharedjs") == -1) return;
            break;
            case "newService":
            if ( dojo.indexOf(eventSchema.events, "service") == -1) return;
            break;
            case "newLiveVar":
            if ( dojo.indexOf(eventSchema.events, "service") == -1) return;
            break;
            case "newNavigation":
            if (dojo.indexOf(eventSchema.events, "navigation") == -1) return;
            break;
            }
        items.push({name: n, dataValue: n});
        }
    });
    / *
      dojo.forEach(sharedEventHandlers, function(e) {
      items.push({name: e, dataValue: e});
      });
    * /
    var typeDef = this.createComponents({WMEventItem: ["wm.TypeDefinition", {internal: true}, {}, {
        eventField01: ["wm.TypeDefinitionField", {"fieldName":"name","fieldType":"string"}, {}],
        eventField02: ["wm.TypeDefinitionField", {"fieldName":"dataValue","fieldType":"string"}, {}],
        eventField03: ["wm.TypeDefinitionField", {"fieldName":"indent","fieldType":"string"}, {}]
    }]});
/ *
    var v = new wm.Variable({
        owner:this,
        type: "WMEventItem"
    });
    v.setData(items);
    * /
    this._items = items;
    //this.setDataSet(v);
    this._inPostInit = false;
    },
    */
    getFullStructure: function() {
    var structure = [];
    this.getStructureFor(studio.page, structure);

    var pageContainerList = wm.listComponents([studio.application, studio.page], wm.PageContainer);
    var firstPageAdded = false;
    for (var i = 0; i < pageContainerList.length; i++) {
        var page = pageContainerList[i].page;
        if (page) {
        if (!firstPageAdded) {
            firstPageAdded = true;
            structure.push({defaultLabel: studio.getDictionaryItem("wm.EventEditor.LIST_PAGECONTAINERS")});
        }
        var submenu = {defaultLabel: pageContainerList[i].page.getRuntimeId().replace(/^studio\.wip\./,""), children: []};
        structure.push(submenu);
        this.getStructureFor(page, submenu.children);
        }
    }
    return structure;
    },
    getStructureFor: function(inPage, inStructure) {
    if (inPage == studio.page) {
        var svarList = wm.listComponents([studio.application, studio.page], wm.ServiceVariable).sort();
        var lightboxList = wm.listComponents([studio.application, studio.page], wm.DojoLightbox);
        var navList = wm.listComponents([studio.application, studio.page], wm.NavigationCall).sort();
        var notificationList = wm.listComponents([studio.application, studio.page], wm.NotificationCall).sort();
        //var sharedEventHandlers =  eventList(this.inspected.getSharedEventLookupName(this.propName), wm.isInstanceType(studio.selected.owner, wm.Application) ? studio.appsourceEditor : studio.editArea);
        var dialogList = wm.listComponents([studio.application, studio.page], wm.Dialog);
        dialogList = dialogList.concat(lightboxList);
        dialogList = dialogList.concat(wm.listComponents([studio.application, studio.page], wm.PopupMenu));
        dialogList = dialogList.sort();
        if (wm.PopupMenu && this.inspected instanceof wm.PopupMenu)
        wm.Array.removeElement(dialogList, this.inspected);
        var layerList = wm.listComponents([studio.application, studio.page], wm.Layer).sort();
        var mobileFoldingList = [];
        wm.forEachWidget(studio.page.root, function(w) {
        if (w.mobileFolding)
            mobileFoldingList.push(w);
        }, true);
        mobileFoldingList = mobileFoldingList.sort();

        var dashboardList = wm.listComponents([studio.application, studio.page], wm.Dashboard).sort();
        var liveformList = wm.listComponents([studio.application, studio.page], wm.LiveForm).sort();
        var dataformList = wm.listComponents([studio.application, studio.page], wm.DataForm).sort();
        var timers = wm.listComponents([studio.application, studio.page], wm.Timer).sort();

    } else {
        /* Subpages components (via page containers in the page being designed) can also be listed, and need suitable events listed ,
         * but now we just call listComponents on the subpage, not on the app and main page */
        var svarList = wm.listComponents([inPage], wm.ServiceVariable).sort();
        var lightboxList = wm.listComponents([inPage], wm.DojoLightbox);
        var navList = wm.listComponents([inPage], wm.NavigationCall).sort();
        var notificationList = wm.listComponents([inPage], wm.NotificationCall).sort();
        //var sharedEventHandlers = [];
        var dialogList = wm.listComponents([inPage], wm.Dialog);
        dialogList = dialogList.concat(lightboxList);
        dialogList = dialogList.concat(wm.listComponents([inPage], wm.PopupMenu));
        dialogList = dialogList.sort();
        if (wm.PopupMenu && this.inspected instanceof wm.PopupMenu)
        wm.Array.removeElement(dialogList, this.inspected);
        var layerList = wm.listComponents([inPage], wm.Layer).sort();
        var mobileFoldingList = [];
        wm.forEachWidget(inPage.root, function(w) {
        if (w.mobileFolding)
            mobileFoldingList.push(w);
        }, true);
        mobileFoldingList = mobileFoldingList.sort();

        var dashboardList = wm.listComponents([inPage], wm.Dashboard).sort();
        var liveformList = wm.listComponents([inPage], wm.LiveForm).sort();
        var dataformList = wm.listComponents([inPage], wm.DataForm).sort();
        var timers = wm.listComponents([inPage], wm.Timer).sort();

    }

    var eventSchema = this.inspected.schema[this.propName];
    var maxPageSize = 15;
    var currentPageSize = 0;
    var separatorAdded = false;

    wm.forEachProperty(wm.prop.EventEditor.eventActions, dojo.hitch(this, function(o, name) {
        var groupName = o.caption, l = o.list;
        if (l) {
        if (!separatorAdded) {
            inStructure.push({separator:true});
            separatorAdded = true;
        }
        var componentList;
        switch(l) {
        case "navigationCall":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "navigation") == -1) return;
            componentList = navList;
            break;
        case "notificationCall":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "notification") == -1) return;
            componentList = notificationList;
            break;

        case "serviceVariable":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "service") == -1) return;
            componentList = svarList;
            break;
/*
        case "sharedEventHandlers":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "js") == -1) return;
            componentList = sharedEventHandlers;
            break;
            */
        case "dialogs":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "dialog") == -1) return;
            componentList = dialogList;
            break;
        case "layers":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "layer") == -1) return;
            componentList = layerList;
            break;

        case "mobileFolding":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "mobileFolding") == -1) return;
            componentList = mobileFoldingList;
            break;

        case "lightboxes":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "lightbox") == -1) return;
            componentList = lightboxList;
            break;
        case "liveForms":
              if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "liveForm") == -1) return;
              componentList = liveformList;
              break;
        case "dataForms":
              if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "dataForm") == -1) return;
              componentList = dataformList;
              break;

        case "dashboards":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "dashboards") == -1) return;
            componentList = dashboardList;
            break;
        case "timers":
            if (eventSchema && eventSchema.events && dojo.indexOf(eventSchema.events, "timers") == -1) return;
            componentList = timers;
            break;
        }

        if (componentList && componentList.length) {
/*
            if (currentPageSize + componentList.length + 1 > maxPageSize && inPage == studio.page) {
            inStructure.push({pageBreak:true});
            currentPageSize = 1;
            } else {
            currentPageSize += 1 + componentList.length;
            }

            var addToArray;
            if (studio.page == inPage) {
            inStructure.push({label: groupName});
            addToArray = inStructure;
            } else {
                */
            var addToArray = [];
            inStructure.push({label: groupName, children: addToArray});
            dojo.forEach(componentList, function(obj) {
            var cname, rname;
            if (obj instanceof wm.Component) {
                cname = obj.getRuntimeId();
                rname = cname;
                if (cname.indexOf(inPage.getRuntimeId() + ".") == 0)
                cname = cname.substring(inPage.getRuntimeId().length + 1);
                rname = rname.replace(/^studio\.wip\./,"");
                if (this.inspected.owner == studio.application && obj.isOwnedBy(studio.page)) {
                    rname = "[" + studio.project.pageName + "]." + rname;
                }
            } else {
                cname = rname = obj;
            }
            if (obj instanceof wm.Dialog){
                addToArray.push({defaultLabel: cname + ".show", onClick: dojo.hitch(this, "setEditorValue", rname + ".show")});
                addToArray.push({defaultLabel: cname + ".hide", onClick: dojo.hitch(this, "setEditorValue", rname + ".hide")});
            } else if (wm.isInstanceType(obj, wm.LiveForm)) {
                var formSubmenu = {label: cname, children: []};
                addToArray.push(formSubmenu);
                formSubmenu.children.push({label: cname + ".beginDataInsert", onClick: dojo.hitch(this, "setEditorValue", rname + ".beginDataInsert")});
                formSubmenu.children.push({label: cname + ".beginDataUpdate", onClick: dojo.hitch(this, "setEditorValue", rname + ".beginDataUpdate")});
                formSubmenu.children.push({label: cname + ".saveData", onClick: dojo.hitch(this, "setEditorValue", rname + ".saveData")});
                formSubmenu.children.push({label: cname + ".deleteData", onClick: dojo.hitch(this, "setEditorValue", rname + ".deleteData")});
                formSubmenu.children.push({label: cname + ".cancelEdit", onClick: dojo.hitch(this, "setEditorValue", rname + ".cancelEdit")});
            } else if (wm.isInstanceType(obj, wm.DataForm)) {
                var formSubmenu = {label: cname, children: []};
                addToArray.push(formSubmenu);
                formSubmenu.children.push({label: cname + ".editNewObject", onClick: dojo.hitch(this, "setEditorValue", rname + ".editNewObject")});
                formSubmenu.children.push({label: cname + ".editCurrentObject", onClick: dojo.hitch(this, "setEditorValue", rname + ".editCurrentObject")});
                if (wm.isInstanceType(obj, wm.DBForm)) {
                formSubmenu.children.push({label: cname + ".saveData", onClick: dojo.hitch(this, "setEditorValue", rname + ".saveData")});
                formSubmenu.children.push({label: cname + ".deleteData", onClick: dojo.hitch(this, "setEditorValue", rname + ".deleteData")});
                }
                formSubmenu.children.push({label: cname + ".cancelEdit", onClick: dojo.hitch(this, "setEditorValue", rname + ".cancelEdit")});
                        } else {
                addToArray.push({defaultLabel: cname,  onClick: dojo.hitch(this, "setEditorValue", rname)});
                        }
            /*
              if (obj instanceof wm.LiveForm){
              items.push({name: aa + '.beginDataInsert', dataValue: aa + '.beginDataInsert'});
              items.push({name: aa + '.saveData', dataValue: aa + '.saveData'});
              items.push({name: aa + '.beginDataUpdate', dataValue: aa + '.beginDataUpdate'});
              //items.push({name: aa + '.updateData', dataValue: aa + '.updateData'});
              items.push({name: aa + '.cancelEdit', dataValue: aa + '.cancelEdit'});
              items.push({name: aa + '.deleteData', dataValue: aa + '.deleteData'});
              } else if (obj instanceof wm.Timer){
              items.push({name: aa + ".startTimer", dataValue: aa + ".startTimer"});
              items.push({name: aa + ".stopTimer", dataValue: aa + ".stopTimer"});
              } else {
              items.push({name: aa, dataValue: aa});
              }
            */
            },this)
        }
        } else {
        if (inPage != studio.page) return;
        if (eventSchema && eventSchema.events)
            switch(name) {
            case "noEvent":
            if ( dojo.indexOf(eventSchema.events, "disableNoEvent") != -1) return;
            case "jsFunc":
            if (dojo.indexOf(eventSchema.events, "js") == -1) return;
            break;
/*
            case "jsSharedFunc":
            if (dojo.indexOf(eventSchema.events, "sharedjs") == -1) return;
            break;
            */
            case "newService":
            if ( dojo.indexOf(eventSchema.events, "service") == -1) return;
            break;
            case "newLiveVar":
            if ( dojo.indexOf(eventSchema.events, "service") == -1) return;
            break;
            case "newNavigation":
            if (dojo.indexOf(eventSchema.events, "navigation") == -1) return;
            break;
            case "newNotification":
            if (dojo.indexOf(eventSchema.events, "notification") == -1) return;
            break;

            }
        //currentPageSize++;
        inStructure.push({label: groupName, onClick: dojo.hitch(this, "setEditorValue", name)});
        }
    }));



    },
    onchange: function() {
    this.inherited(arguments);
    if (this._inPostInit) return;
    var value = this.dataValue;
    var c = this.inspected;
    if (this.isEventAction(value))
        this.doEventAction(value);
    else {
        this.inherited(arguments);
        this.inspected.setProp(this.propName, value);
        if (dojo.indexOf(studio.selected,this.inspected) != -1)
            studio.inspector.reinspect();
        else {
            studio.inspector.setLayerIndex(0);
            studio.inspector.updateCurrentLayersList();
        }
    }
    wm.job("studio.updateDirtyBit",10, function() {studio.updateProjectDirty();});
    },

    doEventAction: function(inEventName) {
        var ea = wm.prop.EventEditor.eventActions, c = this.inspected, p = this.propName, v;
        switch (inEventName) {
                case "noEvent":
            this.setDisplayValue("");
                break;
            case "jsFunc":
                v = c.generateEventName(p);
            window.setTimeout(dojo.hitch(this, function() {
                this.setDisplayValue(v);
            studio.inspector.reinspect();
            }), 50); // wait until after the whole clicking on an option has finished and menu been dismissed before we change the value
                try{c.updatingEvent(p,v);}catch (e){/*do nothing as this might happen if there's a component which does not extends wm.control class*/}
                        eventEdit(c, p.replace(/\d*$/,""), v, c == studio.application);
                break;
/*
            case "jsSharedFunc":
                v = c.generateSharedEventName(p);
            window.setTimeout(dojo.hitch(this, function() {
            this.setDisplayValue(v);
            studio.inspector.reinspect();
            }), 50);
                try{c.updatingEvent(p,v);}catch (e){/ *do nothing as this might happen if there's a component which does not extends wm.control class* /}
                eventEdit(c, p, v, c == studio.application);
                break;
        */
            case "newService":
                c = studio.newComponentButtonClick({componentType: "wm.ServiceVariable"});
                this.setDisplayValue(c.name);
                break;
            case "newLiveVar":
                c = studio.newComponentButtonClick({componentType: "wm.LiveVariable"});
                this.setDisplayValue(c.name);
                break;
            case "newNavigation":
                c = studio.newComponentButtonClick({componentType: "wm.NavigationCall"});
                this.setDisplayValue(c.name);
                break;
            case "newNotification":
                c = studio.newComponentButtonClick({componentType: "wm.NotificationCall"});
                this.setDisplayValue(c.name);
                break;

        }
    }
});


dojo.declare("wm.prop.ImagePicker", wm.prop.SelectMenu, {
    restrictValues: false,
    updateOptions: function() {
    this.options = studio.deploymentService.requestSync("listThemeImages", [studio.application.theme]).results[0];
    }

});

/* TODO: Figure out an upgrade script so we can treat border,borderColor, margin and padding as just more styles */
/* TODO: Figure out how to let the user pick a resources for backgroundImage; also need backgroundPosition and gradient */
dojo.declare("wm.prop.StyleEditor", wm.Container, {
    noBindColumn: true,
    noHelpButton: true,
    verticalAlign: "top",
    horizontalAlign: "left",
    height: "250px",
    inspected: null,
    /* name, editor, editorProps, postFix */
    commonStyles: [
    /*  {name: "border", editor: "wm.Number", layerName: "basicLayer"},
        {name: "borderColor", editor: "wm.ColorPicker", layerName: "basicLayer"},
        {name: "margin", editor: "wm.Text", layerName: "basicLayer"},
        {name: "padding",editor: "wm.Text", layerName: "basicLayer"},*/
        {name: "backgroundColor", editor: "wm.ColorPicker", editorProps: {placeHolder: "#abcdef"}},
        {name: "backgroundGradient", editor: "wm.ColorPicker", editorProps: {gradient:1}},
        {name: "backgroundImage", editor: "wm.Text", editorProps: {placeHolder: "resources/images/myimage.png"}},
        {name: "backgroundRepeat", editor: "wm.SelectMenu", editorProps: {options: ["no-repeat","repeat-x","repeat-y","repeat"]}, advanced:1},
        {name: "color", editor: "wm.ColorPicker", editorProps: {placeHolder: "#abcdef"}},
        {name: "fontWeight", editor: "wm.SelectMenu", editorProps: {options: ["normal","bold","bolder","lighter"]}},
        {name: "fontSize", editor: "wm.Number", postFix: "px", editorProps: {placeHolder: "Integer from 4-100", minimum: 4, maximum: 100, spinnerButtons: 1}},
        {name: "textAlign", editor: "wm.SelectMenu", editorProps: {options: ["left","center","right"]}},
        {name: "verticalAlign", editor: "wm.SelectMenu", editorProps: {options: ["baseline","sub","super", "top","text-top","middle","bottom","text-bottom"]}, advanced:1},
        {name: "textDecoration", editor: "wm.SelectMenu", editorProps: {options: ["none", "underline", "overline", "line-through", "blink"]}},
        {name: "fontStyle", editor: "wm.SelectMenu", editorProps: {options: ["normal", "italic", "oblique"]}},
        {name: "fontVariant", editor: "wm.SelectMenu", editorProps: {options: ["normal", "small-caps"]},advanced:1},
        {name: "fontFamily", editor: "wm.Text", editorProps: {placeHolder: "Arial, Geneva, Helvetica, sans-serif"}},
        {name: "whiteSpace", editor:  "wm.SelectMenu", editorProps: {options: ["normal", "nowrap", "pre","pre-line","pre-wrap"]}},
        {name: "wordBreak",  editor:  "wm.SelectMenu", editorProps: {options: ["normal", "break-word"]},advanced:1},
        {name: "borderRadius", editor: "wm.Text", editorProps:{placeHolder: "8 or 8 8 4 4"}},
        /*{name: "borderTopLeftRadius", editor: "wm.Number", editorProps:{options: {minimum:0, maximum:100, placeHolder: "Number from 0-100"}}},
        {name: "borderBottomRightRadius", editor: "wm.Number", editorProps:{options: {minimum:0, maximum:100, placeHolder: "Number from 0-100"}}},
        {name: "borderBottomLeftRadius", editor: "wm.Number", editorProps:{options: {minimum:0, maximum:100, placeHolder: "Number from 0-100"}}},        */
        {name: "opacity", editor: "wm.Number", editorProps: {"minimum": 0, "maximum": 1, placeHolder: "Number from 0-1"},advanced:1},
        {name: "cursor", editor: "wm.SelectMenu", editorProps: {options: ["pointer", "crosshair", "e-resize","w-resize","n-resize","s-resize","ne-resize","nw-resize","se-resize","sw-resize","text","wait","help","move","progress"]},advanced:1},
        {name: "zIndex", editor: "wm.Number",advanced:1, editorProps: {placeHolder: "Integer"}}
    ],
    search: function(inName) {
        var props = this.inspected.listProperties();
        var result = false;
        wm.forEachProperty(props, function(p, propName) {
           /* TODO: Should test if isEditable prop */
            if (p.group == "style" && propName.toLowerCase().indexOf(inName.toLowerCase()) != -1)
              result = true;
       });
       return result;
    },
    postInit: function() {
        this.inherited(arguments);
        this.editors = {};

        this.tabs = this.createComponents({
            tabs: ["wm.studio.TabLayers",
            {
                _classes: {domNode: ["StudioTabs", "StudioDarkLayers", "StudioDarkerLayers", "NoRightMarginOnTab"]},
                conditionalTabButtons: 1,
                width: "100%",
                fitToContentHeight: true,
                height: "100px",
                clientBorder: "1",
                clientBorderColor: "",
                margin: "0,2,0,0",
                padding: "0",
                border: "0"
            }, {}, {
                basicLayer: ["wm.Layer", {caption: "Basic", padding: "4"}, {}],
                styleLayer: ["wm.Layer",{caption: "Styles", padding: "4"}, {}, {}],
                classLayer: ["wm.Layer",{caption: "Classes", padding: "4"}, {}, {
                    classListEditor: ["wm.prop.ClassListEditor",{width: "100%", inspected: this.inspected}]
                }]
            }]
        }, this)[0];
        this.connect(this.tabs, "onchange", this, function() {
            if (this.parent._isDestroying) return;
            this.setHeight(this.getPreferredFitToContentHeight());
            this.parent.setHeight(this.parent.getPreferredFitToContentHeight());
            dojo.cookie("wm.prop.StyleEditor.layerIndex", this.tabs.layerIndex);
        });

        this.basicLayer = this.tabs.layers[0];
        this.styleLayer = this.tabs.layers[1];
        this.classListLayer = this.tabs.layers[2];
        this.classListEditor = this.classListLayer.c$[0];
        this.tabs.setLayerIndex(dojo.cookie("wm.prop.StyleEditor.layerIndex") || 0);

        var form = new wm.FormPanel({
            owner: this,
            parent: this.styleLayer,
            width: "100%",
            height: "100%",
            autoSizeCaption: true
        });

        var defaultProps = {
            captionPosition: "left",
            captionAlign: "left",
            captionSize: "70px",
            singleLine: false,
            width: "100%",
            height: studio.inspector.defaultEditorHeight,
            allowNone: true,
            owner: this,
            parent: this,
            helpText: true
        };

        dojo.forEach(this.commonStyles, dojo.hitch(this, function(styleProp) {
            if (styleProp.advanced && !studio.inspector.isAdvancedMode()) return;
            var parent;
            if (styleProp.layerName) {
                parent = this[styleProp.layerName];
            } else {
                parent = form;
            }

            var ctor = dojo.getObject(styleProp.editor);
            var props = styleProp.editorProps || {};
            props.caption = styleProp.name;
            props.name = "style_" + styleProp.name;
            var e = new ctor(dojo.mixin(props, defaultProps, {
                parent: parent,
                helpText: null
            }));
            e.connect(e, "onClose", this, function() {
                this.changed(e, e.getDisplayValue(), e.getDataValue(), false, e.editor.dropDown._initialValue || "");
            });
            e.connect(e, "onchange", this, function(inDisplayValue, inDataValue, inSetByCode) {
                this.changed(e, inDisplayValue, inDataValue, inSetByCode);
                wm.job("studio.updateDirtyBit",10, studio, "updateProjectDirty");
            });
            e.connect(e, "onHelpClick", this, function() {
                studio.helpPopup = studio.inspector.getHelpDialog();
                studio.inspector.beginHelp(e.caption, e.domNode, this.inspected.declaredClass);
            });
            this.editors[styleProp.name] = e;
        }));
        form.setBestHeight();

        var propsHash = this.inspected.listProperties();
        var propsArray = [];
        wm.forEachProperty(propsHash, dojo.hitch(this, function(prop, propName) {
            if (prop.group == "style" && !prop.ignore && !prop.hidden && prop.editor != "wm.prop.StyleEditor" && (!prop.advanced || studio.inspector.isAdvancedMode())) {
                propsArray.push(dojo.mixin({
                    name: propName
                }, prop));
            }
        }));

        var mysort = function(a, b) {
                var o = a.order - b.order;
                return o == 0 ? wm.compareStrings(a.name, b.name) : o;
            };
        propsArray.sort(mysort);


        this.owner._generateEditors(this.inspected, this.basicLayer, propsArray);


        var p = new wm.Panel({
            owner: this,
            parent: this.styleLayer,
            width: "100%",
            height: "40px",
            layoutKind: "left-to-right",
            verticalAlign: "bottom"
        });
        var b = new wm.Button({
            _classes: {domNode: ["StudioButton"]},
            owner: this,
            parent: p,
            width: "100%",
            height: "30px",
            caption: "Create CSS Class",
            //hint: "Creates a css class based on these styles",
            hint: "To create a new CSS class that contains the styles above and allows you to reuse that class across many of your widgets, click 'Create Class' and enter a name for the class.  All of the above styles will be removed from this panel and moved to the Source tab -> CSS subtab.",
            onclick: dojo.hitch(this, "generateCssRule")
        });
        /*
             wm.Label({owner: this,
                   caption: "",
                   parent: p,
                   width: "20px",
                   height: "20px",
                   margin: "0",
                   onclick: function() {
                       studio.helpPopup = studio.inspector.getHelpDialog();
                       studio.inspector.beginHelp(null, p.domNode, null, "To create a new CSS class that contains the styles above and allows you to reuse that class across many of your widgets, click 'Create Class' and enter a name for the class.  All of the above styles will be removed from this panel and moved to the Source tab -> CSS subtab.");
                   },
                   _classes: {domNode: ["StudioHelpIcon"]}});
            */
        /*
            var b = new wm.Button({
                 owner: this,
                 parent: this,
                 width: "100%",
                 height: "30px",
                 caption: "Add Style"
             });
             b.connect(b, "onclick", this, function() {
                 this.addEditor("","");
             });*/

        this.setHeight(this.getPreferredFitToContentHeight() + "px");
        this.setDataValue(this.inspected.styles);
        if (this.basicLayer.c$.length == 0) this.basicLayer.hide();
    },
    getDataValue: function() {
        return this.inspected.styles
    },
    reinspect: function() {
        this.setDataValue(this.inspected.styles);
        return true;
    },
    setDataValue: function(inValue) {
        dojo.forEach(this.commonStyles, dojo.hitch(this, function(styleProp) {
            var styleName = styleProp.name;
            var e = this.editors[styleName];
            if (styleProp.postFix && inValue) {
                var value = this.inspected.getStyle(styleName);
                value = value.replace(new RegExp(styleProp.postFix + "$"), "");
            } else {
                value = inValue[styleName];
            }
            if (this.editors[styleProp.name]) {
                this.editors[styleProp.name].setDataValue(value);
            }
        }));
    },
    generateCssRule: function() {
        app.prompt("<p>Enter a name for the CSS class you want to create.</p><p>A new CSS class will be created using the style currently specified for this widget.  Classes can be reused to apply the same styles to other widgets, and can be customized to add new styles.", this.inspected.name, dojo.hitch(this, function(inClassName) {
            if (!inClassName) return;
            var cssText = wm.prop.ClassListEditor.prototype.getClassRuleName(inClassName) + " {\n";
            "You CAN set these styles for nodes inside of widgets, just not for the widgets themselves. */\n";

            if (this.inspected.styles) {
                wm.forEachProperty(this.inspected.styles, dojo.hitch(this, function(styleValue, styleName) {
                    if (!styleValue) return;
                    if (styleName == "backgroundGradient") {
                        cssText += "background: " + wm.getBackgroundStyle(styleValue.startColor, styleValue.endColor, styleValue.colorStop, styleValue.direction, "webkit") + ";\n";
                        cssText += "background: " + wm.getBackgroundStyle(styleValue.startColor, styleValue.endColor, styleValue.colorStop, styleValue.direction, "moz") + ";\n";
                        cssText += "background: " + wm.getBackgroundStyle(styleValue.startColor, styleValue.endColor, styleValue.colorStop, styleValue.direction, "opera") + ";\n";
                        cssText += "background: " + wm.getBackgroundStyle(styleValue.startColor, styleValue.endColor, styleValue.colorStop, styleValue.direction, "ie10") + ";\n";
                        cssText += "filter: " + wm.getBackgroundStyle(styleValue.startColor, styleValue.endColor, styleValue.colorStop, styleValue.direction, "ieold") + ";\n";
					} else if (styleName == "borderRadius") {
						var values = String(styleValue).split(/\s+/);

						for (var i = 0; i < values.length; i++) {
							if (values[i].match(/^\d+$/)) values[i] += "px";
						}
						if (values.length == 1) values[1] = values[2] = values[3] = values[0];
						if (values.length == 2) {
							values[3] = values[0];
							values[2] = values[1];
						}
						if (values.length == 3) {
							values[3] = "0px";
						}
						dojo.forEach(["-webkit-","-moz-","-ms-","-o-",""], function(prefix) {
							if (values[0] === values[1] && values[0] === values[2] && values[0] === values[3]) {
								cssText += prefix + "border-radius: " + values[0] + ";\n";
							} else {
								dojo.forEach(["border-top-left-radius", "border-top-right-radius","border-bottom-left-radius", "border-bottom-right-radius"],
									function(styleName,i) {
										cssText += prefix + styleName + ": " + values[i] + ";\n";
									}
								);
								cssText += "\n";
							}
						});


                    } else {
                        cssText += styleName.replace(/([A-Z])/g, function(inText) {
                            return "-" + inText.toLowerCase();
                        }) + ": " + styleValue + ";\n";
                    }
                    delete this.inspected.styles[styleName];
                }));
                this.setDataValue(this.inspected.styles);
            }
            cssText += "\n}\n";

            this.classLayer.activate();
            // let the grid render if it hasn't already
            wm.onidle(this, function() {
                this.classListEditor.addClass(inClassName);
                this.classListEditor.changed();
                studio.appCssEditArea.setDataValue(studio.appCssEditArea.getDataValue() + "\n\n" + cssText);
                studio.cssChanged();
                this.classListEditor.editClass(inClassName);
            });
        }));
    },
    /*
    addEditor: function(inStyleName, inStyleValue) {
         var p = new wm.Panel({width: "100%",
                   height: "30px",
                   layoutKind: "left-to-right",
                   horizontalAlign: "left",
                   verticalAlign: "top",
                   parent: this,
                   owner: this
                  });

    var nameEditor = new wm.Text({width: "100%",
                      height: "100%",
                      caption: "",
                      emptyValue: "",
                      dataValue: inStyleName,
                      onchange: dojo.hitch(this, function(inDisplayValue, inDataValue) {
                      if (this.inspected.styles[
                      })
                     });
    var styleEditor = new wm.Text({width: "100%",
                      height: "100%",
                      caption: "",
                      emptyValue: "",
                      dataValue: inStyleValue
                     });

    },
    */
    changed: function(inEditor, inDisplayValue, inDataValue, inSetByCode, optionalLastDataValue) {
        var styleName = inEditor.name.replace(/^style_/, "")
        var styleDef;
        for (var i = 0; i < this.commonStyles.length; i++) {
            if (this.commonStyles[i].name == styleName) {
                styleDef = this.commonStyles[i];
                break;
            }
        }
        var postFix = styleDef.postFix;
        if (postFix && (inDataValue || inDataValue === 0)) {
            inDataValue += postFix;
        }
        //this.inspected.setStyle(styleName, inDataValue);
        for (var i = 0; i < studio.selected.length; i++) {
	        if (!inSetByCode && (!inEditor.editor._opened)) { /* Color pickers change the value but only trigger this onClose, so the lastValue must come from the colorPicker not from our current state */
	            var t = new wm.SetPropTask(studio.selected[i], styleName,
	            studio.selected[i].getStyle(styleName) || "", inDataValue, true);
	        } else {
	            studio.selected[i].setStyle(styleName, inDataValue);
	        }
	     }
	     if (t) t.undoCount = studio.selected.length;
    },
    _end: 0
});

dojo.declare("wm.prop.ClassListEditor", wm.Container, {
    height: "200px",
    emptyList: ["<i>No Classes...</i>"],
    postInit: function() {
    this.inherited(arguments);
    new wm.Label({owner: this,
              parent: this,
              width: "100%",
              caption: "Current CSS Classes:"});
    var classListVar = this.classListVar = wm.Variable({owner: this, name: "classListVar", type: "StringData", isList: true});
    // Extract the classes used in the style sheets
    var matches1 = studio.cssEditArea.getDataValue().replace(/\n/gm, " ").replace(/\/\*.*?\*\//g,"").match(/\.([a-zA-Z0-9_\-]*)/g);
    var matches2 = studio.appCssEditArea.getDataValue().replace(/\n/gm, " ").replace(/\/\*.*?\*\//g,"").match(/\.([a-zA-Z0-9_\-]*)/g);

    // Make sure that our class list contains only unique items
    var classesHash = {dialogfooter: true};
    dojo.forEach(matches1, function(className) {classesHash[className.substring(1)] = 1;});
    dojo.forEach(matches2, function(className) {classesHash[className.substring(1)] = 1;});
    wm.forEachProperty(classesHash, function(obj,name) {classListVar.addItem({dataValue: name});});
    classListVar.sort();

    var dataSet = this.dataSet = new wm.Variable({owner: this, name: "dataSet", type: "StringData", isList: true});
    var classList =  (this.inspected._classes && this.inspected._classes.domNode && this.inspected._classes.domNode.length) ? dojo.clone(this.inspected._classes.domNode) : [];
    dojo.forEach(classList, dojo.hitch(this, function(className) {this.dataSet.addItem({dataValue: className});}));
    wm.require("wm.DojoGrid");
    var grid = this.grid = wm.DojoGrid({
        _classes: {domNode: ["StudioGrid"]},
        owner: this,
        parent: this,
        name: "grid",
        singleClickEdit:true,
        width: "100%",
        height: "100%",
        columns: [{show: true, field: "dataValue", width: "100%", "fieldType":"dojox.grid.cells.ComboBox","editorProps":{"selectDataSet":"classListVar","displayField":"dataValue", isSimpleType: true, restrictValues: false}},
              {show: true, field: "edit", width: "16px","formatFunc":"wm_button_formatter","formatProps":{"buttonclass":"Studio_silkIconImageList_75"}, "expression":"\"&nbsp;\""},
              {show: true, field: "delete", width: "16px","formatFunc":"wm_button_formatter","formatProps":{"buttonclass":"wmDeleteColumn"},"expression":"\"&nbsp;\""}],
        onGridButtonClick: dojo.hitch(this, function(fieldName, rowData, rowIndex) {
        switch(fieldName) {
        case "delete":
            var item = this.dataSet.getItem(rowIndex);
            this.dataSet.removeItem(rowIndex);
            this.grid.deleteRow(rowIndex);
            this.changed();
            break;
        case "edit":
            var item = this.dataSet.getItem(rowIndex);
            var className = item.getValue("dataValue");
            this.editClass(className);
            break;
        }
        }),
        onCellEdited: dojo.hitch(this, "changed")
    });
    this.grid.setDataSet(this.dataSet);
/*
        new wm.ListSet({owner: this,
                parent: this,
                showSearchBar: false,
                width: "100%",
                height: "100%",
                dataField: "dataValue",
                displayField: "dataValue",
                options: this.inspected._classes && this.inspected._classes.domNode && this.inspected._classes.domNode.length ? dojo.clone(this.inspected._classes.domNode) : this.emptyList
               });
    grid.grid.setDeleteColumn(grid.options != this.emptyList);
    grid.grid.connect(grid.grid, "onRowDeleted", this, "removeClass");
    */
    var addPanel = new wm.Panel({owner: this,
                     parent: this,
                     width: "100%",
                     height: "30px",
                     layoutKind: "left-to-right",
                     verticalAlign: "top",
                     horizontalAlign: "left"
                    });

    this.addButton = new wm.Button({owner: this,
                    parent: addPanel,
                    name: "addButton",
                    caption: "Add Class",
                    _classes: {domNode: ["StudioButton"]},
                    width: "100px",
                    onclick: dojo.hitch(this, "addClass")});
    new wm.Label({owner: this,
              parent: this,
              width: "100%",
              height: "32px",
              singleLine: false,
              caption: "Add a CSS class to this widget to style it"});
    this.reflow();
    },
    getClassRuleName: function(inClassName) {
    return "html.WMApp body ." + inClassName;
    },
    addClass: function(inClassName) {
        this.changed();
        var className = (typeof inClassName == "string") ? inClassName : "";
        this.grid.addRow({
            dataValue: className || ""
        }, true);
    },
    editClass: function(className) {
        studio.editCodeDialog.show();

        var cssText = studio.cssEditArea.getDataValue();
        if (studio.cssEditArea.getDataValue().indexOf("." + className) == -1) {
            cssText = studio.appCssEditArea.getDataValue();
        }
        var code = "";
        var currentIndex = 0;
        var startAndEndList = [];
        while (true) {
            var startIndex = cssText.indexOf("." + className, currentIndex);
            if (startIndex == -1) break;
            var endIndex = cssText.indexOf("}", startIndex) + 1;

            // there may be rules before this rule: ".xxx, .wmbutton" so just go back to the end of the previous rule ".....}"
            startIndex = cssText.lastIndexOf("}", startIndex) + 1;

            currentIndex = endIndex;

            code += cssText.substring(startIndex, endIndex) + "\n";
            startAndEndList.push({
                start: startIndex,
                end: endIndex
            });
        }
        if (!code) {
            code = this.getClassRuleName(className) + " {\n\n}";
        }
        studio.editCodeDialog.page.update("Edit " + className, code, "css", dojo.hitch(this, function(inCode) {
            var editArea;
            if (cssText && cssText == studio.cssEditArea.getDataValue()) {
                editArea = studio.cssEditArea;
            } else if (cssText == studio.appCssEditArea.getDataValue()) {
                editArea = studio.appCssEditArea;
            }
            // if either editor has somehow changed, this edit is invalidated
            if (editArea) {
                if (startAndEndList.length == 0) {
                    if (cssText) cssText += "\n\n";
                    cssText += inCode.replace(/^\s*/m,"");
                } else if (startAndEndList.length > 1) {
                    /* If there are multiple places showing the selected class, the chance of us doing a good job updating
                     * the right ones is pretty slim; the user may have added a new rule, removed an old rule, maintaining
                     * the order just isn't trivial.  So, remove all blocks of code wherever they are so that we can put in
                     * a new block with all the user's new CSS in a single place
                     */
                    for (var i = startAndEndList.length - 1; i >= 0; i--) {
                        cssText = cssText.substring(0, startAndEndList[i].start) + cssText.substring(startAndEndList[i].end);
                    }
                    while (startAndEndList.length > 1) startAndEndList.pop();
                    startAndEndList[0].start = cssText.length;
                    if (cssText) cssText += "\n\n";
                    cssText += inCode.replace(/^\s*/m,"");
                    startAndEndList[0].end = cssText.length + inCode.length;
                } else {
                    cssText = cssText.substring(0, startAndEndList[0].start) + inCode + cssText.substring(startAndEndList[0].end);
                    startAndEndList[0].end = startAndEndList[0].start + inCode.length;
                }
                editArea.setDataValue(cssText);
                studio.cssChanged();
            }
        }));
    },
/*
    addClass: function(inClassName) {
    this.textInput.setDataValue(inClassName);
    this._addClass();
    },
    _addClass: function() {
    var value = this.textInput.getDataValue();
    this.textInput.clear();
    if (value) {
        var options = this.grid.options;
        if (options == this.emptyList) {
        options = [];
        this.grid.grid.setDeleteColumn(true);
        }
        options.push(value);
        this.grid.setOptions(options);
        this.inspected.addUserClass(value);
    }
    this.textInput.focus();
    },
    removeClass: function(inRowId, inRowData) {
    var options = this.grid.options;
    if (options != this.emptyList) {
        wm.Array.removeElement(options, inRowData.dataValue);
        //this.grid.setOptions(options); // row already removed, and the removeElement updated the options array
        if (options.length == 0) {
        this.grid.setOptions(this.emptyList);
        this.grid.grid.setDeleteColumn(false);
        }
        this.inspected.removeUserClass(inRowData.dataValue);
    } else {
        this.setOptions(this.emptyList);
        this.grid.grid.setDeleteColumn(false);
    }
    },
    */
    changed: function() {
        if (this.inspected._classes && this.inspected._classes.domNode) {
            for (var i = this.inspected._classes.domNode.length - 1; i >= 0; i--) {
                if (this.inspected._classes.domNode) {
                    this.inspected.removeUserClass(this.inspected._classes.domNode[i]);
                }
            }
        }
        for (var i = 0; i < this.dataSet.getCount(); i++) {
            var className = this.dataSet.getItem(i).getValue("dataValue");
            if (className) {
                this.inspected.addUserClass(className);
            } else {
                this.dataSet.removeItem(i);
                i--;
            }
        }
    },    getDataValue: function() {
    return this.inspected._classes && this.inspected._classes.domNode ? dojo.clone(this.inspected._classes.domNode) : [];
    },
    setDataValue: function(inValue) {
    this.grid.setOptions(this.inspected._classes && this.inspected._classes.domNode && this.inspected._classes.domNode.length ? dojo.clone(this.inspected._classes.domNode) : this.emptyList);
    this.grid.grid.setDeleteColumn(this.grid.options != this.emptyList);
    },
    _end: 0
});

dojo.declare("wm.prop.RolesEditor", wm.CheckboxSet, {
    noBindColumn: true,
    noReinspect: true,
    height: "120px",
    dataField: "dataValue",
    displayField: "dataValue",
    forceCaptionPositionTop: true,
    init: function() {
    this.inherited(arguments);
    this.parent.setVerticalAlign("top");
    /* Use studio.application._roles so we know we've got the latest set of roles for THIS project */
    if (!studio.application._roles) {
        studio.securityConfigService.requestSync("getRoles", [], dojo.hitch(this, function(inData) {
        wm.roles = inData;
        studio.application._roles = inData;
        }));
    }
    },
    postInit: function() {
    this.inherited(arguments);
    var options = ["Everyone"].concat(wm.roles);

    this.setOptions(options);
    var roles = this.inspected.roles || ["Everyone"];
    if (dojo.indexOf(roles, "Everyone") != -1) {
        this.hadEveryone = true;
    }

    this.setDataValue(roles);
    },
    setDataValue: function(inValue) {
    if (wm.isEmpty(inValue)) {
        this.inherited(arguments, [["Everyone"]]);
    } else {
        this.inherited(arguments);
    }
    },
    getDataValue: function() {
    var value = this.inherited(arguments);
    if (value && value.length == 1 && value[0] === "Everyone") {
        return null;
    } else {
        return value;
    }
    },
    changed: function() {
    if (!this._inDoChange) {
        this._inDoChange = true;
        var count = 0;
        for (var i = 0; i < this.dijits.length; i++) {
        count += (this.dijits[i].get("checked")) ? 1 : 0;
        }
        if (this.dijits[0]) {
        if (count ==  1) {
            this.hadEveryone = this.dijits[0].checked;
        } else if (count == 0) {
            this.dijits[0].set("checked", true, false);
            this.dijits[0]._lastValueReported = true;
            this.hadEveryone = true;
        } else if (this.hadEveryone && this.dijits[0].checked) {
            this.hadEveryone = false;
            this.dijits[0].set("checked", false, false);
            this.dijits[0]._lastValueReported = false;
        } else if (this.dijits[0].checked) {
            this.hadEveryone = true;
            for (var i = 1; i < this.dijits.length; i++) {
            this.dijits[i].set("checked", false, false);
            this.dijits[i]._lastValueReported = false;
            }
        }
        }
        delete this._inDoChange;
        this.inherited(arguments);
        this.inspected.setRoles(this.getDataValue());
    }
    },
    reinspect: function() {return true;}
});


dojo.declare("wm.prop.FieldGroupEditor", wm.Container, {
    showMainInput: true,
    multiLayer: true,
    height: "300px",
    indent: 0,
    noBindColumn: true, // wm.PropertyInspector tests for this to decide if this editor needs a bind column
    noHelpButton: true, // wm.PropertyInspector tests for this to decide if this editor needs a help button/column
    inspected: null,    // Component being inspected
    padding: "0",
    postInit: function() {
    this.inherited(arguments);
    if (this.multiLayer) {
        this.tabs = this.createComponents({
        tabs: ["wm.studio.TabLayers", {_classes: {domNode: ["StudioTabs",  "StudioDarkLayers", "StudioDarkerLayers", "NoRightMarginOnTab"]},width: "100%", height: "100%", clientBorder: "1",clientBorderColor: "", margin: "0,2,0,0", padding: "0"}, {}, {
            bindLayer: ["wm.Layer", {caption: "Bindings", padding: "4", autoScroll: true}, {},{
            }],
            fieldLayer: ["wm.Layer", {caption: "Fields", padding: "4", autoScroll: true}, {},{
            fieldsLabel: ["wm.Label", {_classes: {domNode: ["BindDescriptionHeader"]}, width: "100%", caption: wm.capitalize(this.propDef.name) + " Fields"}],
            fieldForm: ["wm.FormPanel", {width: "100%", height: "100%", autoSizeCaption: true}]
            }]
        }]
        }, this)[0];
        this.bindLayer = this.tabs.layers[0];
        this.fieldLayer =this.tabs.layers[1];
        this.fieldForm = this.fieldLayer.c$[1];
        if (!this.showMainInput) this.fieldLayer.activate();
    } else {
        studio.inspector.addSubGroupIndicator("Inputs", this, true, false);
/*
        this.fieldsLabel = new wm.Label({_classes: {domNode: ["BindDescriptionHeader"]},
                         owner: this,
                         parent: this,
                         width: "100%",
                         caption: wm.capitalize(this.propDef.name) + " Fields"});*/
        this.fieldForm = new wm.FormPanel({owner: this,
                           parent: this,
                           width: "100%",
                           height: "100%",
                           autoSizeCaption: true});
    }

    if (this.propDef.putWiresInSubcomponent) {
        this.inspectedSubcomponent = this.inspected.getValue(this.propDef.putWiresInSubcomponent);
    }

    /* Add a subheader in the property panel for this set of editors */
    studio.inspector.addSubGroupIndicator(this.propDef.name,this);

    this.editors = {};

    /* Determine if this property should be shown or not */
/*
    if (this.propDef.advanced && !studio.inspector.isAdvancedMode()) {
        this.setShowing(false);
    } else {
        this.setShowing(true); // wm.PropertyInspector will set this to hidden if the entire thing is bound assuming a bind-editor will be shown instead; not applicable for this particular editor
    }
    */
    this.generateEditors(this.inspected);
    },
    generateEditors: function(c) {
    this.propDef.treeBindRoot = this.propDef.name;
    var propDef = dojo.clone(this.propDef);
    propDef.advanced = false; // ComponentInspector's already taking care of this for us
    propDef.editor = "wm.prop.DataSetSelect";
    propDef.fullName = propDef.name;
    if (!propDef.editorProps) {
        propDef.editorProps = {};
    }
    propDef.editorProps.matchComponentType = true;
    propDef.editorProps.widgetDataSets = true;
    if (this.propDef.putWiresInSubcomponent) {
        propDef.editorProps.disabled = true;
        propDef.editorProps.alwaysDisabled = true;
        propDef.editorProps.hideBindColumn = true;
    }

    /* Don't edit this.inspectedSubcomponent if it exists; if there is anything bound to the whole object, its binding is in
     * this.inspected, not in the subcomponent
     */
    if (this.showMainInput) {
        var e= studio.inspector.generateEditor(this.inspected, propDef, this.bindLayer || this.fieldForm,null,this.propDef.name);
        this.editors._ROOT = e;
    }

    if (this.bindLayer) {
        this.bindDescWidget = new wm.Html({owner: this, parent: this.bindLayer, width: "100%", height: "100%", margin: "5, 0, 0, 0"});
        this.updateBindDescription();
    }
    this.generateSubEditors();
    },
    generateSubEditors: function() {
    var propDef = dojo.clone(this.propDef);
    if (!propDef.editorProps) {
        propDef.editorProps = {};
    }

    delete propDef.editorProps.disabled;
    delete propDef.editorProps.hideBindColumn;
    propDef.editorProps.matchComponentType = true;
    propDef.editorProps.widgetDataSets = true;
    if (this.propDef.putWiresInSubcomponent) {
        propDef.editorProps.disabled = true;
        propDef.editorProps.alwaysDisabled = true;
        propDef.editorProps.hideBindColumn = true;
    }


    var isBound = studio.inspector.isPropBound(this.inspected, propDef);


    this.indent++;

    var inspected = this.inspectedSubcomponent || this.inspected;

    var fields;
    if (inspected instanceof wm.Variable) {
        fields  = inspected._dataSchema;
    } else if (inspected.getValue(this.propDef.name) instanceof wm.Variable) {
        fields  = inspected.getValue(this.propDef.name)._dataSchema;
    }
    if (fields) {

/*
        this.fieldPanel =  panel = new wm.Panel({owner: this,
                             parent: this,
                             _classes: {domNode: ["StudioFieldGroupPanel"]},
                             name: "FieldGroupInnerPanel_" + propDef.name,
                             showing: !isBound,
                             layoutKind: "top-to-bottom",
                             border: "1",
                             borderColor: "",
                             margin: "0,0,0,20",
                             width: "100%",
                             height: "100%"});
        var label = new wm.Label({owner: this,
                      parent: panel,
                      name: "fieldGroupLabel",
                      width: "100%",
                      caption: (propDef.shortname || propDef.name) + " fields"
                     });
                     */
        this._generatedSchema = dojo.toJson(fields);
        wm.forEachProperty(fields, dojo.hitch(this,function(fieldDef, fieldName) {
        var type = fieldDef.type;
        var isStructured = wm.typeManager.isStructuredType(type);
        var fullName;
        if (this.propDef.putWiresInSubcomponent) {
            fullName = fieldName;
        } else {
            fullName = this.propDef.name + "." + fieldName;
        }
        /* dojo.mixin used this way insures we work on a copy of propDef and don't modify e.propDef before its onclick is fired */
        propDef = this.getPropDef(propDef, fieldName, fullName,type, isStructured);
        if (propDef.editor == "wm.prop.DataSetSelect" && propDef.editorProps)  {
            propDef.editorProps.widgetDataSets = true;
            propDef.editorProps.matchComponentType = true;
        }

        e = studio.inspector.generateEditor(inspected, /* Component we are editing (or subcomponent in our case) */
                            propDef, /* Property we are editing within the component */
                            this.fieldForm, /* Parent panel */
                            null, /* ignore */
                            this.propDef.name /* Append this to the editor name to avoid naming colisions */
                           );
        this.editors[inspected.getId() + "." + fieldName] = e;
        }));
        //this.fieldPanel.setBestHeight();
    }
    if (!this.multiLayer) {
        this.fieldForm.setBestHeight();
        this.setBestHeight();
        this.parent.setBestHeight();
    }
    this.reflow();
    },
    showAllEditors: function() {
    wm.forEachProperty(this.editors, function(e) {
        e.parent.setShowing(true);
    });
    },
    getPropDef: function(sourcePropDef, fieldName, fullName, type, isStructured) {
    var propDef = dojo.mixin({}, sourcePropDef, {

            /* The name of the field we are editing is "fieldName"; this is used for
             * 1. Naming the editor
             * 2. Calling getValue/setValue on the right property
             */
            name: fieldName,

            /* The type of the property we are editing; used by bind dialog to validate the type;
             * for literal types may be used to chose an editor widget for the property
             */
            type: type || propDef.type,

            /* fullName is the full property path used to lookup wires, open the bind dialog to the right node, etc... */
            fullName: fullName,

            /* rootName lets us pass around the root property name that will be the root node for the bind dialog's propTree */
            rootName: this.propDef.name,

            /* If its a structured type, use a DataSetSelect editor to pick a suitable value; else use the default editor for that type */
            editor: isStructured  ? "wm.prop.DataSetSelect" : undefined,

                bindValuesOnly: true,

            editorProps: {
            /* If its a DataSetSelect, only list components of matching types */
            matchComponentType: isStructured,

            /* if the user types in a value into a text editor, treat it as a bind expression */
                createExpressionWire: !isStructured
            },

            /* When this editor changes, create a wire rather than calling c.setValue(propName,newValue) */
            createWire: true,
            noHelpButton: true
        });
    return propDef;
    },
    updateBindDescription: function() {
        if (!this.bindDescWidget) return;
        var propDef = this.propDef;
        var inspected = this.inspectedSubcomponent || this.inspected;
        var bindTextNodes = document.createElement("dl");
        if (inspected.$.binding) {
            var self = this;
            wm.forEachProperty(inspected.$.binding.wires, dojo.hitch(this, function(wire, target) {
                if (target.indexOf(propDef.name + ".") == 0 || this.inspectedSubcomponent) {
                    var dt = document.createElement("dt");
                    dt.innerHTML = target.replace(/^.*?\./, "") + '<img src="images/inspector_bind_disabled.gif" class="DeleteBindButton">';
                    dojo.query("img", dt).onclick(function() {

                        new wm.SetWireTask(wire.owner.owner, wire.targetProperty, {
                            source: wire.source,
                            expression: wire.expression,
                            value: wire.owner.owner.getValue(wire.targetProperty)
                        }, "", false, true);
                    }).onmouseover(function(e) {
                            app.createToolTip("Delete Binding", this, e);
                    });
                    var dd = document.createElement("dd");
                    dd.innerHTML = (wire.expression ? "expr: " + wire.expression : wire.source);

                    bindTextNodes.appendChild(dt);
                    bindTextNodes.appendChild(dd);
                }

            }));
        }
        if (bindTextNodes.childNodes.length == 0) {
            bindTextNodes.innerHTML = studio.getDictionaryItem("BIND_PROP_PANEL_NOBINDINGS");
        }

        while (this.bindDescWidget.domNode.firstChild) {
            this.bindDescWidget.domNode.removeChild(this.bindDescWidget.domNode.firstChild);
        }
        this.bindDescWidget.domNode.appendChild(bindTextNodes);

    },
    reinspect: function() {
    this.updateBindDescription();
    var inspected = this.inspectedSubcomponent || this.inspected;
     var isBound = studio.inspector.isPropBound(inspected, this.propDef);

    /* TODO: fieldPanel does not appear to exist anymore */
    if (!isBound && this.fieldPanel && !this.fieldPanel.showing) {
        this.fieldPanel.show();
        //this.fieldPanel.setBestHeight();
        //this.setBestHeight();
        //this.parent.setBestHeight();
    } else if (isBound && this.fieldPanel && this.fieldPanel.showing) {
        //this.fieldPanel.hide();
        //this.setBestHeight();
        //this.parent.setBestHeight();
    }

    /* If the type we are editing has been changed to a different type, or its been edited so that the fields are different, regenerate
     * all editors
     */
    if (this._generatedSchema != dojo.toJson(inspected._dataSchema)) {
        for (var e in this.editors) {
        if (e != "_ROOT" && this.editors[e] instanceof wm.AbstractEditor) {
            this.editors[e].parent.destroy();
            delete this.editors[e];
        }
        }
        this.generateSubEditors(inspected);
        if (this.editors._ROOT) {
            this.editors._ROOT.updateOptions();
        }
        //this.parent.setBestHeight();
    } else {
        /* Else call reinspectEditor on each editor */
        wm.forEachProperty(this.editors, dojo.hitch(this, function(e,editorName) {
        // don't know how its losing this value, but it must have this value
        e.bindValuesOnly = true;
        studio.inspector.reinspectEditor(editorName === "_ROOT" ? this.inspected || this.inspectedSubcomponent : inspected, /* Component we are editing */
                         e, /* Editor used to edit this component property */
                         null, /* Bind editor used to edit this component (wm.PropertyInspector will look this up) */
                         e.propDef,/* Property Definition for the property we are editing */
                         this.propDef.name /* Value to append to the name for avoiding naming colisions; used for looking up the editor in the editorHash/bindEditorHash */
                        );
        }));
    }
    return true;
    },
    removeAllControls: function() {
    wm.forEachProperty(this.editors, dojo.hitch(this, function(e,editorName) {
        delete this.editors[editorName];
        wm.forEachProperty(studio.inspector.editorHash, function(e2, editorName) {
            if (e == studio.inspector.editorHash[editorName]) {
            delete studio.inspector.editorHash[editorName];
            delete studio.inspector.bindEditorHash[editorName];
            }
        });
        e.parent.destroy();
    }));
    this.inherited(arguments);
    }
});


dojo.declare("wm.prop.NavigationGroupEditor", wm.prop.FieldGroupEditor, {
    showMainInput: false,
    multiLayer: false,
    getPropDef: function(sourcePropDef, fieldName, fullName, type, isStructured) {
    var propDef = this.inherited(arguments);
    switch(fieldName) {
    case "pageName":
        propDef.editor =  "wm.prop.PagesSelect";
        propDef.editorProps.newPage = false;
        break;
    case "pageContainer":
        propDef.editor = "wm.prop.WidgetSelect";
        propDef.editorProps.widgetType = wm.PageContainer;
        propDef.editorProps.useOwner = this.inspected.owner.getRuntimeId();
        propDef.editorProps.createExpressionWire = false;
        break;
    case "layer":
        propDef.editor = "wm.prop.WidgetSelect";
        propDef.editorProps.widgetType = wm.Layer;
        propDef.editorProps.useOwner = this.inspected.owner.getRuntimeId();
        propDef.editorProps.createExpressionWire = false;
        break;
    case "layers":
        propDef.editor = "wm.prop.WidgetSelect";
        propDef.editorProps.widgetType = wm.Layers;
        propDef.editorProps.useOwner = this.inspected.owner.getRuntimeId();
        propDef.editorProps.createExpressionWire = false;
        break;
    case "cssClasses":
        propDef.editor = "";
        propDef.options = ["Success", "Error", "Warning", "Info", "Misc"];
        break;
    case "duration":
        propDef.editor = "";
        propDef.options = ["1000", "2000", "3000", "4000", "5000", "6000", "8000", "10000", "15000"];
        break;
    case "dialogPosition":
        propDef.editor = "";
        propDef.options = ["", "top left", "top center", "top right", "center left", "center center", "center right", "bottom left", "bottom center", "bottom right"];
        break;
    case "sourceType":
        propDef.editor = "";
        propDef.options = ["PhotoLibrary", "Camera", "SavedPhotoAlbum"]
        break;
    default:
        propDef.editor = "";
        delete propDef.options;
    }

    return propDef;
    }
});

dojo.declare("wm.prop.SubComponentEditor", wm.Container, {
    noHelpButton: true,/* This container doesn't get a help button; the editors in it do */
    noBindColumn: true,/* This container doesn't get a bind button; the editors in it will if they are bindable */
    inspected: null,
    propDef: null,
    postInit: function() {
    this.inherited(arguments);
    this.subinspected = this.inspected.getValue(this.propDef.name);
    if (this.subinspected) {
        this.parent.show();
        this.generateEditors();
    } else {
        this.parent.hide();
    }
    },
    generateEditors: function() {
    this._lastClassInspected = this.subinspected.declaredClass;

    this.removeAllControls();
    var props = studio.inspector.props;
    studio.inspector.props = studio.inspector.getProps(this.subinspected,true);
    studio.inspector._generateEditors(this.subinspected, this, studio.inspector.props, true);
    studio.inspector.props = props;
    this.setBestHeight();
    this.parent.setBestHeight();
    },
    reinspect: function() {
    this.subinspected = this.inspected.getValue(this.propDef.name);
    if (!this.subinspected) {
        this.parent.hide();
    } else {
        this.parent.show();
        if (this._lastClassInspected != this.subinspected.declaredClass) {
        this.generateEditors();
        } else {
        var props = studio.inspector.props;
        studio.inspector.props = studio.inspector.getProps(this.subinspected,true);
        studio.inspector._reinspect(this.subinspected);
        studio.inspector.props = props;
        }
    }
    return true;
    }
});

dojo.declare("wm.prop.FormatterEditor", wm.prop.SubComponentEditor, {
    margin: "0,0,0,15"
});


dojo.declare("wm.prop.AllCheckboxSet", wm.CheckboxSet, {
    dataField: "dataValue",
    displayField: "name",
    forceCaptionPositionTop: true,
    init: function() {
    this.inherited(arguments);
    this.parent.setVerticalAlign("top");
    },
    setDataValue: function(inValue) {
    if (wm.isEmpty(inValue)) {
        this.inherited(arguments, [["All"]]);
    } else {
        this.inherited(arguments);
    }
    },
    getDataValue: function() {
    var value = this.inherited(arguments);
    if (value && value.length == 1 && (value[0] === "All" || value[0] == "")) {
        return null;
    } else {
        return value;
    }
    },
    changed: function() {
    if (!this._inDoChange) {
        this._inDoChange = true;
        var count = 0;
        for (var i = 0; i < this.dijits.length; i++) {
        count += (this.dijits[i].get("checked")) ? 1 : 0;
        }
        if (this.dijits[0]) {
        if (count ==  1) {
            this.hadAll = this.dijits[0].checked;
        } else if (count == 0) {
            this.dijits[0].set("checked", true, false);
            this.dijits[0]._lastValueReported = true;
            this.hadAll = true;
        } else if (this.hadAll && this.dijits[0].checked) {
            this.hadAll = false;
            this.dijits[0].set("checked", false, false);
            this.dijits[0]._lastValueReported = false;
        } else if (this.dijits[0].checked) {
            this.hadAll = true;
            for (var i = 1; i < this.dijits.length; i++) {
            this.dijits[i].set("checked", false, false);
            this.dijits[i]._lastValueReported = false;
            }
        }
        }
        delete this._inDoChange;
        this.inherited(arguments);
    }
    }/*,
    reinspect: function() {return true;}*/
});


dojo.declare("wm.prop.DeviceSizeEditor", wm.prop.AllCheckboxSet, {
    noBindColumn: true,
    noReinspect: true,
    height: "390px",

    init: function() {
    this.inherited(arguments);

    this.displaySizes = new wm.Variable({owner: this, type: "EntryData", isList:1});

    this.displaySizes.setData([{name: "All",
                    dataValue: ""},
                   {name: ">= 1800px<div class='AllCheckboxSetNote'>1920px monitor; window almost full screen</div>", // NOTE: ipad in landscape mode is 1024px
                    dataValue: "1800"},
                   {name: "1400px-1800px<div class='AllCheckboxSetNote'>1440px monitor; window almost full screen</div>", // NOTE: ipad in landscape mode is 1024px
                    dataValue: "1400"},
                   {name: "1150px-1300px<div class='AllCheckboxSetNote'>large window</div>", // NOTE: ipad in landscape mode is 1024px
                    dataValue: "1150"},
                   {name: "900px-1150px<div class='AllCheckboxSetNote'>Medium window, iPad in Landscape mode</div>",
                    dataValue: "900"},
                   {name: "650px-900px<div class='AllCheckboxSetNote'>medium desktop, iPad in Portrait mode</div>",
                    dataValue: "650"},
                   {name: "450px-650px<div class='AllCheckboxSetNote'>Large phone/Small tablet in Portrait mode</div>",
                    dataValue: "450"},
                   {name: "300px-450px<div class='AllCheckboxSetNote'>iPhone</div>",
                    dataValue: "300"},
                   {name: "200px<div class='AllCheckboxSetNote'>Sidebar Application</div>",
                    dataValue: "200"}]);
    this.setDataSet(this.displaySizes);
    }
});


dojo.declare("wm.prop.DeviceListEditor", wm.prop.AllCheckboxSet, {
    noBindColumn: true,
    noReinspect: true,
    height: "130px",
    init: function() {
    this.inherited(arguments);
    this.deviceList = new wm.Variable({owner: this, type: "EntryData", isList:1});
    this.deviceList.setData([{name: "All",
                  dataValue: ""},
                 {name: "Desktop",
                  dataValue: "desktop"},
                 {name: "Tablet",
                  dataValue: "tablet"},
                 {name: "Phone",
                  dataValue: "phone"}]);
    this.setDataSet(this.deviceList);
    }
});

dojo.declare("wm.prop.Diagnostics", wm.Container, {
    noHelpButton: true,
    noBindColumn: true,
    height: "300px",
    fitToContentHeight: true,
    postInit: function() {
    this.inherited(arguments);
    this.editors = {};
    this.parent.setFitToContentHeight(true);
    this.tabs = this.createComponents({
        tabs: ["wm.studio.TabLayers", {_classes: {domNode: ["StudioTabs",  "StudioDarkLayers", "StudioDarkerLayers", "NoRightMarginOnTab"]},width: "100%", height: "300px", fitToContentHeight: true, clientBorder: "1",clientBorderColor: "", margin: "0,2,0,0", padding: "0"}, {}, {
        descLayer: ["wm.Layer", {caption: "Description"}, {},{
            descHtml: ["wm.Html", {width: "100%", height: "100px", autoSizeHeight: true, padding: "3", autoScroll:false}]
        }],
        notesLayer: ["wm.Layer", {caption: "Notes"}, {},{
            notesEditor: ["wm.RichText", {syntax: "text", width: "100%", height: "300px"}]
        }],
        docsLayer: ["wm.Layer", {caption: "Docs"}, {}, {
            docsHtml: ["wm.Html", {width: "100%", height: "100px", padding: "3", autoSizeHeight: true, autoScroll:false}]
        }]
        }]
    },this)[0];
    this.descLayer  = this.tabs.layers[0];
    this.descHtml  = this.descLayer.c$[0];
    this.notesLayer = this.tabs.layers[1];
    this.notesEditor = this.notesLayer.c$[0];
    this.docsLayer  = this.tabs.layers[2];
    this.docsHtml = this.docsLayer.c$[0];
    this.descHtml.scheduleAutoSize = this.docsHtml.scheduleAutoSize = function() {
        if (!this._cupdating)
        this.doAutoSize(true,true);
    };
    this.notesEditor.connect(this.notesEditor, "onchange", this, dojo.hitch(this, function(inDataValue, inDisplayValue) {
        this.inspected.documentation = inDataValue;
        wm.job("studio.updateDirtyBit",10, studio, "updateProjectDirty");
    }));
    this.tabs.connect(this.tabs, "onchange", this, function() {
        dojo.cookie("wm.prop.Diagnostics.layerIndex", this.tabs.layerIndex);
        if (this.docsLayer.isActive()) {
        if (!this.docsHtml.html) {
            this.update();
        } else {
            this.docsHtml.scheduleAutoSize();
        }
        } else if (this.descLayer.isActive()) {
        this.descHtml.doAutoSize(true,true);
        }
    });
    this.tabs.setLayerIndex(dojo.cookie("wm.prop.Diagnostics.layerIndex") || 0);
    this.update();
    this.connect(this, "onShow", this, "update");
    },
    destroy: function() {
    delete this.descLayer;
    delete this.descHtml;
    delete this.notesLayer;
    delete this.notesEditor;
    delete this.descLayer;
    delete this.docsHtml;
    this.inherited(arguments);
    },
    setDataValue: function() {
    this.update();
    },
    reinspect: function() {
    this.update();
    return true;
    },
    update: function() {
    if (this.isAncestorHidden()) return;
    this.descHtml.setHtml(this.inspected.generateDocumentation());
    this.notesEditor.setDataValue(this.inspected.documentation || "");

    if (!this.docsHtml.isAncestorHidden()) {
        var url = studio.loadHelp(this.inspected.declaredClass, "", dojo.hitch(this, function(inData) {
        if (inData)
            this.docsHtml.setHtml(inData);
        }));
        this.docsHtml.setHtml("Loading <a target='docs' href='" + url + "'>docs...</a>");
    }
    }
});