/*
 * Copyright (C) 2011-2012 VMware, Inc. All rights reserved.
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
 

MenuDesigner.widgets = {
    editMenuItemDialog: ["wm.DesignableDialog", {_classes: {domNode: ["studiodialog"]}, "height":"200px","title":"Edit Menu Item","width":"350px"}, {}, {
            mainPanel1: ["wm.studio.DialogMainPanel", {},{}, {
		    menuItemName: ["wm.Text", {"caption":"Name","captionSize":"130px","displayValue":"", width:"100%"}, {"onEnterKeyPress":"onTextEnterKeyPress"}],
		        menuItemImageListPanel: ["wm.Panel", {layoutKind: "left-to-right", height: "24px", width: "100%"},{}, {
			    menuItemImageList: ["wm.SelectMenu", {"caption":"Image List (optional)","captionSize":"130px", width: "100%"}, {}],
			    menuItemImageListLabel: ["wm.Label", {width: "60px", height: "100%", caption: "Pick Icon:"}],
			    menuItemImageListBtn: ["wm.ToolButton", {width: "24px", height: "100%", margin: "2", padding: "0", border: "1"}, {onclick: "popupImageSelector"}]
			}],
		    menuItemIconClass: ["wm.Text", {"caption":"Icon Class","captionSize":"130px","displayValue":"",width:"100%"}, {"onEnterKeyPress":"onTextEnterKeyPress"}],
		    menuIdInPage: ["wm.Text", {showing: false, "caption":"Menu Item ID","captionSize":"130px","displayValue":"",width:"100%"}, {}],
		    menuItemIsCheckbox: ["wm.Checkbox", {caption: "Has Checkbox", captionSize: "130px", width: "100%"}]
		}],
		buttonBar: ["wm.Panel", {"_classes":{"domNode":["dialogfooter"]},"border":"1,0,0,0","height":"32px","horizontalAlign":"right","layoutKind":"left-to-right","verticalAlign":"top","width":"100%"}, {}, {
			menuItemCancelButton: ["wm.Button", {_classes: {domNode: ["StudioButton"]},"caption":"Cancel"}, {"onclick":"menuItemCancelButtonClick"}],
			menuItemOKButton: ["wm.Button", {_classes: {domNode: ["StudioButton"]},"caption":"OK"}, {"onclick":"menuItemOKButtonClick"}]
		}]
	}],
	smallToolbarImageList: ["wm.ImageList", {width: 16, height: 16, colCount: 32, url: "images/smallToolbarBtns.png"}, {}],
	layoutBox1: ["wm.Layout", {"height":"100%","horizontalAlign":"left","verticalAlign":"top","width":"100%"}, {}, {
            mainPanel: ["wm.studio.DialogMainPanel", {},{}, {
		treeLabel: ["wm.Label", {caption: "Use tree to design your dialog", height: "20px", width: "100%"}],
		panel2: ["wm.Panel", {_classes: {domNode: ["StudioDarkPanel"]}, "height":"100%","horizontalAlign":"left","layoutKind":"top-to-bottom","verticalAlign":"top","width":"100%", border: "1", borderColor: "#959DAB"}, {}, {
            toolbar: ["wm.Panel", {_classes: {domNode: ["StudioToolBar"]}, border: "0,0,1,0", borderColor: "#959DAB", layoutKind: "left-to-right", height: "29px", width: "100%", horizontalAlign: "left", verticalAlgin: "top"}, {}, {

    			AddButton: ["wm.studio.ToolbarButton", {hint: "Add Menu Item", "caption":"",imageList: "smallToolbarImageList", imageIndex: 25}, {"onclick":"AddButtonClick"}],
    			EditButton: ["wm.studio.ToolbarButton", {hint: "Edit Menu Item (or double click item)", "caption":"",imageList: "studio.silkIconImageList", imageIndex: 75}, {"onclick":"EditButtonClick"}],
    			DeleteButton: ["wm.studio.ToolbarButton", {hint: "Delete Menu Item", "caption":"",imageList: "smallToolbarImageList", imageIndex: 0}, {"onclick":"DeleteButtonClick"}],
    			SeparatorButton: ["wm.studio.ToolbarButton", {hint: "Add Separator", "caption":"", iconUrl: "images/h_splitter_handle.gif", iconMargin: "8px 0px 0px 3px"}, {"onclick":"SeparatorButtonClick"}]//,
    			//DefaultItemButton: ["wm.ToolButton", {hint: "Make selected item the initial button value", "caption":"","width":"16px", height: "16px", imageList: "smallToolbarImageList", imageIndex: 2}, {"onclick":"DefaultButtonClick"}]
			
		    }],

		    tree: ["wm.DraggableTree", {"border":"0","dropBetweenNodes":true,"height":"100%"}, {"ondblclick":"treeDblclick", ondeselect: "treeDeselect", onselect: "treeSelect"}]/*,
			sample: ["wm.DojoMenu", {"eventList":[{"label":"File","children":[{"label":"New"},{"label":"Open"},{"label":"Save"},{"label":"Close"}],"onClick":undefined},{"label":"Edit"},{"label":"Zoom"}],"height":"100%","structure":"{\"items\":[{\"label\":\"File\"},{\"label\":\"Edit\"},{\"label\":\"Zoom\"}]}","vertical":true,"width":"115px"}, {}]*/
		}]
	    }],
	    buttonBar: ["wm.Panel", {_classes: {domNode: ["dialogfooter"]}, height: "20px", "horizontalAlign":"left","layoutKind":"left-to-right","verticalAlign":"top","width":"100%", padding: "2,0,2,0", border: "1,0,0,0", height: "34px", horizontalAlign: "right"}, {}, {
			 CancelButton: ["wm.Button", {_classes: {domNode: ["StudioButton"]},caption: "Cancel"}, {onclick: "mainCancelClick"}],
			 OKButton: ["wm.Button", {_classes: {domNode: ["StudioButton"]},caption: "OK"}, {onclick: "mainOKClick"}]
		     }]
	}]
}