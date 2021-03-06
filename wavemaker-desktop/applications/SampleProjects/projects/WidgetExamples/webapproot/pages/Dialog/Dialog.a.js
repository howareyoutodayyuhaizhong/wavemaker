dojo.declare("Dialog", wm.Page, {
"preferredDevice": "desktop",
start: function() {
//	try {
var layerName;
// If layer is specified, go to that layer
/*
if (app instanceof WidgetExamples) {
layerName = app.layerNameVar.getValue('dataValue');
} else {
layerName = '';
}
if (layerName !== '') {
app.layerNameVar.setValue('dataValue','');
var layerArray = ['button','toggle','busy','popup','right'];
if (dojo.indexOf(layerArray, layerName) >=0)
this.tabLayers1.setLayer(layerName);
else
app.toastError("Unrecognized Page parameter in url = "+ layerName);
}
//	} catch(e) {
//		app.toastError(this.name + ".start() Failed: " + e.toString());
//	}
*/
},
_end: 0
});

Dialog.widgets = {
loadingDialog1: ["wm.LoadingDialog", {}, {}, {
binding: ["wm.Binding", {}, {}, {
wire: ["wm.Wire", {"expression":undefined,"source":"label1","targetProperty":"widgetToCover"}, {}]
}]
}],
layoutBox1: ["wm.Layout", {"_classes":{"domNode":["MainContent"]},"horizontalAlign":"left","verticalAlign":"top"}, {}, {
panel12: ["wm.MainContentPanel", {"height":"34px","horizontalAlign":"left","layoutKind":"left-to-right","verticalAlign":"middle","width":"770px"}, {}, {
label8: ["wm.Label", {"_classes":{"domNode":["SectionHeader"]},"autoSizeWidth":true,"caption":"Dialog Examples","height":"34px","padding":"4","width":"102px"}, {}, {
format: ["wm.DataFormatter", {}, {}]
}]
}],
tabLayers1: ["wm.TabLayers", {"headerHeight":"28px","manageURL":true}, {}, {
pageDialogLayer: ["wm.Layer", {"border":"1","borderColor":"#999999","caption":"Page Dialog","horizontalAlign":"left","margin":"2,0,2,0","padding":"","themeStyleType":"ContentPanel","verticalAlign":"top"}, {}, {
pageContainer1: ["wm.PageContainer", {"deferLoad":true,"pageName":"Dialog_PageDialog","subpageEventlist":{},"subpageMethodlist":{},"subpageProplist":{}}, {}]
}],
notificationsLayer: ["wm.Layer", {"border":"1","borderColor":"#999999","caption":"Notification Services","horizontalAlign":"left","margin":"2,0,2,0","padding":"","verticalAlign":"top"}, {}, {
pageContainer4: ["wm.PageContainer", {"deferLoad":true,"pageName":"Dialog_NotificationServices","subpageEventlist":{},"subpageMethodlist":{},"subpageProplist":{}}, {}]
}],
designableDialogLayer: ["wm.Layer", {"border":"1","borderColor":"#999999","caption":"Designable Dialog","horizontalAlign":"left","margin":"2,0,2,0","padding":"","verticalAlign":"top"}, {}, {
pageContainer6: ["wm.PageContainer", {"deferLoad":true,"pageName":"Button_TogglePanel","subpageEventlist":{},"subpageMethodlist":{},"subpageProplist":{}}, {}]
}],
toolTipsLayer: ["wm.Layer", {"border":"1","borderColor":"#999999","caption":"Tooltips","horizontalAlign":"left","margin":"2,0,2,0","padding":"","themeStyleType":"ContentPanel","verticalAlign":"top"}, {}, {
pageContainer3: ["wm.PageContainer", {"deferLoad":true,"pageName":"Button_Popup","subpageEventlist":{},"subpageMethodlist":{},"subpageProplist":{}}, {}]
}],
loadingDialogLayer: ["wm.Layer", {"border":"1","borderColor":"#999999","caption":"Loading Dialog","horizontalAlign":"left","margin":"2,0,2,0","padding":"","verticalAlign":"top"}, {}, {
pageContainer5: ["wm.PageContainer", {"deferLoad":true,"pageName":"Button_Right","subpageEventlist":{},"subpageMethodlist":{},"subpageProplist":{}}, {}]
}]
}]
}]
};

Dialog.prototype._cssText = 'body.tundra .button .wmlayout .button-label8 {\
}\
';
Dialog.prototype._htmlText = '';