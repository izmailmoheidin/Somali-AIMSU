import { Component, OnInit } from '@angular/core';
import { StoreService } from '../services/store-service';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationRecipientService } from '../services/notification-recipient.service';
import { SecurityHelperService } from '../services/security-helper.service';
import { Settings } from '../config/settings';
import { BlockUI, NgBlockUI } from 'ng-block-ui';

@Component({
  selector: 'app-manage-notification-recipient',
  templateUrl: './manage-notification-recipient.component.html',
  styleUrls: ['./manage-notification-recipient.component.css']
})
export class ManageNotificationRecipientComponent implements OnInit {
  isBtnDisabled: boolean = false;
  recipientId: number = 0;
  btnText: string = 'Add recipient';
  errorMessage: string = '';
  requestNo: number = 0;
  isForEdit: boolean = false;
  isError: boolean = false;
  model = { email: null, name: null, isActive: true };
  entryForm: any = null;
  permissions: any = {};

  @BlockUI() blockUI: NgBlockUI;

  constructor(private storeService: StoreService, private route: ActivatedRoute,
    private recipientService: NotificationRecipientService, private securityService: SecurityHelperService,
    private router: Router) { }

  ngOnInit() {
    this.permissions = this.securityService.getUserPermissions();
    if (!this.permissions.canEditEmailMessage) {
      this.router.navigateByUrl('home');
    }
    this.storeService.newReportItem(Settings.dropDownMenus.management);

    if (this.route.snapshot.data && this.route.snapshot.data.isForEdit) {
      var id = this.route.snapshot.params["{id}"];
      if (id) {
        this.btnText = 'Save changes';
        this.isForEdit = true;
        this.recipientId = id;
        this.loadRecipient(id);
      }
    }

    this.requestNo = this.storeService.getNewRequestNumber();
    this.storeService.currentRequestTrack.subscribe(model => {
      if (model && this.requestNo == model.requestNo && model.errorStatus != 200) {
        this.errorMessage = model.errorMessage;
        this.isError = true;
      }
    });
  }

  loadRecipient(id) {
    this.recipientService.getNotificationRecipients().subscribe(
      data => {
        if (data) {
          var recipient = data.filter(r => r.id == id);
          if (recipient.length > 0) {
            var r = recipient[0];
            this.model.email = r.email;
            this.model.name = r.name;
            this.model.isActive = r.isActive;
          }
        }
      }
    );
  }

  saveRecipient(frm: any) {
    this.entryForm = frm;
    this.btnText = this.isForEdit ? 'Saving...' : 'Adding...';
    this.isBtnDisabled = true;

    if (this.isForEdit) {
      this.recipientService.updateNotificationRecipient(this.recipientId.toString(), this.model).subscribe(
        data => {
          if (data) {
            this.router.navigateByUrl('notification-recipients');
          } else {
            this.resetFormState();
          }
        },
        error => {
          this.resetFormState();
        }
      );
    } else {
      this.recipientService.addNotificationRecipient(this.model).subscribe(
        data => {
          if (data) {
            this.router.navigateByUrl('notification-recipients');
          } else {
            this.resetFormState();
          }
        },
        error => {
          this.resetFormState();
        }
      );
    }
  }

  resetFormState() {
    this.isBtnDisabled = false;
    this.btnText = this.isForEdit ? 'Save changes' : 'Add recipient';
    if (this.entryForm) {
      this.entryForm.resetForm();
    }
  }
}
