sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/ContextBinding",
    "sap/ui/core/ValueState",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/commons/TextView",
    "sap/m/UploadCollectionParameter",
    "xxxx/Experiments/NeuesExperiment/model/formatter"
], function (jQuery, Controller, JSONModel, MessageToast, ContextBinding, ValueState, Filter, Fragment, FilterOperator, MessageBox, TextView, UploadCollectionParameter, formatter) {
    return Controller.extend("xxxx.Experiments.NeuesExperiment.controller.Detail", {

        formatter: formatter,
        onInit: function () {
            var oViewModel = new JSONModel({
                busy: false,
                delay: 0
            });

            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("detail").attachPatternMatched(this._onObjectMatched, this);
            this.getView().setModel(oViewModel, "detailView");
            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

        },
        _onObjectMatched: function (oEvent) {
            var sChangeId = oEvent.getParameter("arguments").changeId;
            this.getView().getModel().metadataLoaded().then(function () {
                var sChangePath = this.getView().getModel().createKey("ChangeRequests", {
                    ChangeID: sChangeId
                });
                this._bindView("/" + sChangePath);
            }.bind(this));
        },
        _bindView(sChangePath) {
            // Set busy indicator during view binding
            var oViewModel = this.getView().getModel("detailView");
            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            oViewModel.setProperty("/busy", false);
            this.getView().bindElement({
                path: sChangePath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested() {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },
        _onBindingChange() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();
            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                oRouter().getTargets().display("NotFound");
                // if object could not be found, the selection in the master list
                // does not make sense anymore.
                this.getOwnerComponent().oListSelector.clearMasterListSelection();
                return;
            }
            var sPath = oElementBinding.getPath()
            this.getOwnerComponent().oListSelector.selectAListItem(sPath);
        },
        handleEmailPress(){
            sap.m.URLHelper.triggerEmail("Denis.Smith@gmail.com", "Hallo");
        },

        onChange: function (oEvent) {
            var oUploadCollection = oEvent.getSource();
            // Header Token
            var oCustomerHeaderToken = new UploadCollectionParameter({
                name: "x-csrf-token",
                value: "securityTokenFromModel"
            });
            oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
            // MessageToast.show("File Uploaded");

        },

        onUploadStarts: function (oEvent) {
            // Header Slug
            var oCustomerHeaderSlug = new sap.m.UploadCollectionParameter({
                name: "slug",
                value: oEvent.getParameter("Filename")
            });
            oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);
            setTimeout(function () {
                MessageToast.show("Upload Starts...");
            }, 4000);
        },
        _onMetadataLoaded() {
            // Store original busy indicator delay for the detail view
            var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                oViewModel = this.getView().getModel("detailView");
            // Make sure busy indicator is displayed immediately when
            // detail view is displayed for the first time
            oViewModel.setProperty("/delay", 0);
            // Binding the view will set it to not busy - so the view is always busy if it is not bound
            oViewModel.setProperty("/busy", true);
            // Restore original busy indicator delay for the detail view
            oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
        },
        onUploadComplete: function (oEvent) {
            // var value = oEvent.getParameter("Filename");
            if (this.bIsUploadVersion) {
                this.updateFile(oEvent.getParameters());
            } else {
                var oData = this.getView().byId("UploadCollection").getModel().getData();
                var aItems = jQuery.extend(true, {}, oData).items;
                var oItem = {};
                var sUploadedFile = oEvent.getParameter("files")[0].Filename;
                // at the moment parameter fileName is not set in IE9
                if (!sUploadedFile) {
                    var aUploadedFile = (oEvent.getParameters().getSource().getProperty("value")).split(/\" "/);
                    sUploadedFile = aUploadedFile[0];
                }
                oItem = {
                    "ID": jQuery.now().toString(), // generate Id,
                    "Filename": sUploadedFile,
                    "MimeType": "",
                    "thumbnailUrl": "",
                    "url": ""

                };
                aItems.unshift(oItem);
                this.getView().byId("UploadCollection").getModel().setData({
                    "items": aItems
                });
                // Sets the text to the label
                this.getView().byId("attachmentTitle").setText(this.getAttachmentTitleText());
            }
            setTimeout(function () {
                MessageToast.show("UploadComplete event triggered.");
            }, 3000);
        },
        getAttachmentTitleText: function () {
            var aItems = this.getView().byId("UploadCollection").getItems();
            return "Uploaded (" + aItems.length + ")";
        },
        updateFile: function (oNewFileParameters) {
            var oData = this.getView().byId("UploadCollection").getModel().getData();
            var aItems = jQuery.extend(true, {}, oData).items;
            // Adds the new metadata to the file which was updated.
            // for (var i = 0; i < aItems.length; i++) {
            //     if (aItems[i].documentId === this.oItemToUpdate.getDocumentId()) {
            //         // Uploaded by
            //         aItems[i].attributes[0].text = "You";
            //         // Uploaded on
            //         aItems[i].attributes[1].text = new Date(jQuery.now()).toLocaleDateString();
            //         // Version
            //         // var iVersion = parseInt(aItems[i].attributes[3].text);
            //         // 	iVersion++;
            //         // 	aItems[i].attributes[3].text = iVersion;
            //     }
            // }
            // Updates the model.
            this.getView().byId("UploadCollection").getModel().setData({
                "items": aItems
            });
            this.bIsUploadVersion = false;
            this.oItemToUpdate = null;

        },
        // onUploadTerminated: function (oEvent) {
        //     // get parameter file name
        //     var sFileName = oEvent.getParameter("Filename");
        //     // get a header parameter (in case no parameter specified, the callback function getHeaderParameter returns all request headers)
        //     var oRequestHeaders = oEvent.getParameters().getHeaderParameter();
        //     MessageToast.show("Terminating...");
        // },

        // onUploadComplete: function(oEvent) {
        //     var sUploadedFile = oEvent.getParameter("files")[0].fileName;
        //     var location = oEvent.getParameter("files")[0].headers.location;
        //     var index = location.indexOf("/Attachments");
        //     var path = location.substring(index);
        //     var oCollection = oEvent.getSource();
        //     var collectionPath = "Attachments('" + _gp_id + "')/AKTEN";
        //     var oTemplate = this.byId(_collectionItemId).clone();
        //     _collectionItemId = oTemplate.getId();
        //     oCollection.bindAggregation("items", {
        //         path: collectionPath,
        //         template: oTemplate
        //     });
        //     setTimeout(function(){
        //         MessageToast.show(_oBundle.getText("dokumentHochgeladen"));
        //     }, 3000);
        // },
        handleUserItemPressed: function (oEvent) {
            var oButton = oEvent.getSource();
            if (!this._actionSheet) {
                this._actionSheet = sap.ui.xmlfragment(
                    "ilc.Experiments.NeuesExperiment.view.FragDialog",
                    this
                );
                this.getView().addDependent(this._actionSheet);
            }
            this._actionSheet.openBy(oButton);
        },
        handleBookmarkPressed: function (oEvent) {
            const BookMark = this._getBookMark();

            BookMark.openBy(oEvent.getSource());
        },
        _getBookMark(){

            if (!this._oBookMark) {
                this._oBookMark = sap.ui.xmlfragment("ilc.Experiments.NeuesExperiment.view.BookmarkDialog", this);
                this.getView().addDependent(this._oBookMark);
            }
            return this._oBookMark;


        },
        handleAboutPressed: function (oEvent) {
            if (!this._infoDialog) {
                this._infoDialog = sap.ui.xmlfragment("ilc.Experiments.NeuesExperiment.view.InfoDialog", this);
                // this._infoDialog.setModel(this.getView().getModel());
            }
            // toggle compact style
            jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._infoDialog);
            this._infoDialog.open();
        },
        handleFeedbackPressed: function () {
            var FeedDialog = this._getFeedDialog();
            var oContext = this.getView().getModel().createEntry("/Comments", {
                groupId: "SaveFeedback",
                properties: {
                    Comment: "",
                    Improvement: ""
                },
                success: () => {
                    FeedDialog.setBindingContext(null);
                    FeedDialog.close();
                    this.getView().getModel().refresh(true);
                }
            });

            FeedDialog.setBindingContext(oContext);
            FeedDialog.open();
            // if (!this._FeedDialog) {
            //     this._FeedDialog = sap.ui.xmlfragment("ilc.Experiments.NeuesExperiment.view.FeedbackDialog", this);
            // }
            // jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._FeedDialog);
            // // this.getView.setBindingContext(null);
            // this._FeedDialog.open();
            // sap.ui.getCore().byId("Comment").getModel().refresh(true);
            // sap.ui.getCore().byId("Layout").getModel().refresh(true);

        },
        onPressExcellent: function () {
            var oTextView = new sap.ui.commons.TextView({
                text: "EXCELLENT",
                width: "200px",
                semanticColor: sap.ui.commons.TextViewColor.Positive,
                design: sap.ui.commons.TextViewDesign.H3
            });
            oTextView.placeAt("Result");
        },
        handleSignOutPressed: function(){
            MessageBox.confirm("Are you sure You want to SignOut?");

        },
        // onSegmentButtonAction: function(oEvent) {
        //     var oItem = oEvent.getParameter("id"),
        //         sItemPath="";
        //     // while (oItem instanceof sap.m.SegmentedButtonItem) {
        //     //     sItemPath = oItem.getText();
        //     //     oItem = oItem.getParent();
        //     // }
        //     //
        //     // sItemPath = sItemPath.substr(0, sItemPath.lastIndexOf());
        //
        //     // MessageToast.show("Thank u For Ur Feedback: " + oItem);
        // // }
        // //     // var oItem = oEvent.getParameter("item"),sItemPath = "";
        //     var oTextView = new sap.ui.commons.TextView();
        // //     // sItemPath = oItem.getText() + sItemPath;
        //     oTextView.setText(oItem);
        //     oTextView.placeAt("Layout");
        //     // this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
        //     // MessageToast.show("Action triggered on item: " + sItemPath);
        // },


        onPressHappy: function (evt) {
            // var oTextView = new sap.ui.commons.TextView();
            // oTextView.setText("GOOD");
            // oTextView.placeAt("Layout");
            var oTextView = new sap.ui.commons.TextView({
                text: "GOOD",
                wrapping: false,
                width: "200px",
                semanticColor: sap.ui.commons.TextViewColor.Positive,
                design: sap.ui.commons.TextViewDesign.H3
            });
            oTextView.placeAt("Result");
            // oTextView.placeAt("Layout");
        },
        onPressAverage: function () {
            var oTextView = new sap.ui.commons.TextView({
                text: "AVERAGE",
                width: "200px",
                semanticColor: sap.ui.commons.TextViewColor.Default,
                design: sap.ui.commons.TextViewDesign.H3
            });
            oTextView.placeAt("Result");
        },
        onPressPoor: function () {
            var oTextView = new sap.ui.commons.TextView({
                text: "POOR",
                width: "200px",
                semanticColor: sap.ui.commons.TextViewColor.Critical,
                design: sap.ui.commons.TextViewDesign.H3
            });
            oTextView.placeAt("Result");
        },
        onPressVeryPoor: function () {
            var oTextView = new sap.ui.commons.TextView({
                text: "VERY POOR",
                width: "200px",
                semanticColor: sap.ui.commons.TextViewColor.Negative,
                design: sap.ui.commons.TextViewDesign.H3
            });
            oTextView.placeAt("Result");
        },
        onCancelPressed: function (oEvent) {
            // var dialog = this._getCreateDialog();
            // var oContext = dialog.getBindingContext();
            // this.getView().getModel().deleteCreatedEntry(oContext);
            // dialog.setBindingContext(null);
            // dialog.close();
            var FeedDialog = this._getFeedDialog();
            var oRate = sap.ui.getCore().getElementById("Result");
            // var oContext = FeedDialog.getBindingContext();
            // this.getView().deleteCreatedEntry(oContext);
            FeedDialog.setBindingContext(null);
            // // oEvent.getSource().getBinding("items").filter([]);
            FeedDialog.close();
            var oComment = sap.ui.getCore().getElementById("Comment");
            oComment.setValue("");
            oRate.destroy();

        },
        onSendPressed: function (oEvent) {
            // var oView = this.getView();
            var FeedDialog = this._getFeedDialog();
            var oComment = sap.ui.getCore().getElementById("Comment");
            var oRate = sap.ui.getCore().getElementById("Result");
            // var oContext = FeedDialog.getBindingContext();
            this.getView().getModel().submitChanges({
                groupId: "SaveFeedback"
            });
            var msg = "Thank you for your feedback. It helps us improve our applications. Your ILC User Experience Team";
            MessageToast.show(msg);

            FeedDialog.setBindingContext(null);
            // this.getView().byId("layout").getSelectedKey("");
            // oView.getModel().byId("Comment").refresh(true);
            FeedDialog.close();
            // this.getView.byId("layout").setValue("");
            oComment.setValue("");
            // oRate.destroy();
        },
        _getFeedDialog: function () {
            if (!this._FeedDialog) {
                this._FeedDialog = sap.ui.xmlfragment("ilc.Experiments.NeuesExperiment.view.FeedbackDialog", this);
                this.getView().addDependent(this._FeedDialog);
            }

            return this._FeedDialog;
        },
        onOkPressed: function () {
            var infoDialog = this._getinfoDialog();
            // var oContext = infoDialog.getBindingContext();
            // this.getView().getModel().deleteCreatedEntry(oContext);
            // infoDialog.setBindingContext(null);
            infoDialog.close();
        },
        _getinfoDialog: function () {
            if (!this._infoDialog) {
                this._infoDialog = sap.ui.xmlfragment("ilc.Experiments.NeuesExperiment.view.InfoDialog", this);
                this.getView().addDependent(this._infoDialog);
            }
            return this._infoDialog;
        },
        handleSelectDialogPress: function (oEvent) {
            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment("ilc.Experiments.NeuesExperiment.view.MaterialListDialog", this);
                this._oDialog.setModel(this.getView().getModel());
            }
            var bMultiSelect = !!oEvent.getSource().data("multi");
            this._oDialog.setMultiSelect(bMultiSelect);
            // clear the old search filter
            this._oDialog.getBinding("items").filter([]);

            // toggle compact style
            jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialog);
            this._oDialog.open();
        },

        handleSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter("Name", sap.ui.model.FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },
        handleClose: function (oEvent) {
            var aContexts = oEvent.getParameter("selectedContexts");
            if (aContexts.length) {
                // var oItemTemplate = new sap.ui.core.ListItem({text: "{Name}"});
                var oTable = this.getView().byId("ObjectTable");
                MessageToast.show("Item Added");
                // MessageToast.show("Added Item:" + aContexts.map(function (oContext) {
                //         return oContext.getObject().Name;
                //     }).join(","));
                var model = this.getView().getModel();
                var changeRequest = this.getView().getModel().getProperty(this.getView().getElementBinding().getPath());
                var index;
                for (index = 0; index < aContexts.length; index++) {
                    var oDocument = model.getProperty("/AffectObjects('" + aContexts[index].getProperty("ID") + "')");
                    if (!oDocument) {
                        model.createEntry("/AffectObjects", {
                            properties: {
                                ObjID: aContexts[index].getProperty("ID"),
                                Name: aContexts[index].getProperty("Name"),
                                Number: aContexts[index].getProperty("Number"),
                                Description: aContexts[index].getProperty("Description"),
                                ChangeID: changeRequest.ChangeID,
                                AffID: aContexts[index].getProperty("AffID")
                            },
                            groupId: "NewObject"
                        });
                    }
                }
                model.submitChanges({groupId: "NewObject"});
                this.getView().getModel().refresh(true);
                oTable.setBindingContext.bind(aContexts);
            }
            oEvent.getSource().getBinding("items").filter([]);
        },
        // handleEditPress(){
        //     this._oData = jQuery.extend({}, this.getView().getModel().getData());
        //     this._toggleButtonsAndView(true);
        // },
        // handleSavePress: function () {
        //     this._toggleButtonsAndView(false);
        // },
        // handleCancelPress: function () {
        //     var oModel = this.getView().getModel();
        //     var oData = oModel.getData();
        //     this._toggleButtonsAndView(false);
        // },
        // _toggleButtonsAndView: function(bEdit) {
        //     var oView = this.getView();
        //     oView.byId("editButton").setVisible(!bEdit);
        //     oView.byId("saveButton").setVisible(bEdit);
        //     oView.byId("cancelButton").setVisible(bEdit);
        // },


        onSelectDialogPress: function (oEvent) {
            if (!this._oCreateDialog) {
                this._oCreateDialog = sap.ui.xmlfragment("ilc.Experiments.NeuesExperiment.view.CreateDocumentListDialog", this);
                this._oCreateDialog.setModel(this.getView().getModel());
            }
            var bMultiSelect = !!oEvent.getSource().data("multi");
            this._oCreateDialog.setMultiSelect(bMultiSelect);
            // clear the old search filter
            this._oCreateDialog.getBinding("items").filter([]);

            // toggle compact style
            jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oCreateDialog);
            this._oCreateDialog.open();
        },
        onSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter("Description", sap.ui.model.FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },
        onClose: function (oEvent) {
            var aContexts = oEvent.getParameter("selectedContexts");
            if (aContexts.length) {
                var oTable = this.getView().byId("DocumentTable");
                var model = this.getView().getModel();
                var changeRequest = this.getView().getModel().getProperty(this.getView().getElementBinding().getPath());
                var index;
                for (index = 0; index < aContexts.length; index++) {
                    var oDocument = model.getProperty("/Documents('" + aContexts[index].getProperty("Document") + "')");
                    if (!oDocument) {
                        model.createEntry("/Documents", {
                            properties: {
                                DocumentID: aContexts[index].getProperty("Document"),
                                TID: aContexts[index].getProperty("TID"),
                                Art: aContexts[index].getProperty("Art"),
                                Description: aContexts[index].getProperty("Description"),
                                Version: aContexts[index].getProperty("Version"),
                                ChangeID: changeRequest.ChangeID
                            },
                            groupId: "AddDocument"
                        });
                    }
                }
                model.submitChanges({groupId: "AddDocument"});
                oTable.setBindingContext.bind(aContexts);
            }
            oEvent.getSource().getBinding("items").filter([]);
        },
        onPress(oEvent){
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("documentview");
        },
        onItemPress(oEvent){
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            // oRouter.navTo("bomview");
            var oItem, oCtx;
            oItem = oEvent.getSource();
            oCtx = oItem.getBindingContext();
            oRouter.navTo("bomview", {
                objId: oCtx.getProperty("ObjID")
            });

        },
        onObjectListUpdateFinished(oEvent){
            this.getView().getModel("detailView").setProperty("/countobjectLists", oEvent.getParameter("total"));
        },
        onDocumentListUpdateFinished(oEvent){
            this.getView().getModel("detailView").setProperty("/countLists", oEvent.getParameter("total"));
        },
        onDownloadItem: function (oEvent) {
            var oUploadCollection = this.getView().byId("UploadCollection");
            var aSelectedItems = oUploadCollection.getSelectedItems();
            if (aSelectedItems) {
                for (var i = 0; i < aSelectedItems.length; i++) {
                    oUploadCollection.downloadItem(aSelectedItems[i], true);
                }
            } else {
                MessageToast.show("Select an item to download");
            }
        },
        onVersion: function (oEvent) {
            var oUploadCollection = this.getView().byId("UploadCollection");
            this.bIsUploadVersion = true;
            this.oItemToUpdate = oUploadCollection.getSelectedItem();
            oUploadCollection.openFileDialog(this.oItemToUpdate);
        },

        onSelectionChange: function (oEvent) {
            var oUploadCollection = this.getView().byId("UploadCollection");
            // If there's any item selected, sets download button enabled
            if (oUploadCollection.getSelectedItems().length > 0) {
                this.getView().byId("downloadButton").setEnabled(true);
                if (oUploadCollection.getSelectedItems().length === 1) {
                    this.getView().byId("versionButton").setEnabled(true);
                } else {
                    this.getView().byId("versionButton").setEnabled(false);
                }
            } else {
                this.getView().byId("downloadButton").setEnabled(false);
                this.getView().byId("versionButton").setEnabled(false);
            }
        }
    });
});

