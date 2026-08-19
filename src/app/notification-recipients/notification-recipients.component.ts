import { Component, OnInit } from '@angular/core';
import { NotificationRecipientService } from '../services/notification-recipient.service';
import { SecurityHelperService } from '../services/security-helper.service';
import { Router } from '@angular/router';
import { ModalService } from '../services/modal.service';
import { Settings } from '../config/settings';
import { InfoModalComponent } from '../info-modal/info-modal.component';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { StoreService } from '../services/store-service';

@Component({
  selector: 'app-notification-recipients',
  templateUrl: './notification-recipients.component.html',
  styleUrls: ['./notification-recipients.component.css']
})
export class NotificationRecipientsComponent implements OnInit {
  recipientsList: any = [];
  filteredRecipientsList: any = [];
  permissions: any = {};
  criteria: string = null;
  isLoading: boolean = true;
  isBtnDisabled: boolean = false;
  errorMessage: string = null;
  pagingSize: number = Settings.rowsPerPage;

  @BlockUI() blockUI: NgBlockUI;

  constructor(private recipientService: NotificationRecipientService,
    private securityService: SecurityHelperService,
    private router: Router, private modalService: ModalService,
    private storeService: StoreService) { }

  ngOnInit() {
    this.permissions = this.securityService.getUserPermissions();
    if (!this.permissions.canEditEmailMessage) {
      this.router.navigateByUrl('home');
    }
    this.storeService.newReportItem(Settings.dropDownMenus.management);
    this.getRecipients();
  }

  getRecipients() {
    this.recipientService.getNotificationRecipients().subscribe(
      data => {
        if (data) {
          this.recipientsList = data;
          this.filteredRecipientsList = data;
        }
        this.isLoading = false;
      }
    );
  }

  searchRecipients() {
    if (!this.criteria) {
      this.filteredRecipientsList = this.recipientsList;
    } else {
      if (this.recipientsList.length > 0) {
        var criteria = this.criteria.toLowerCase();
        this.filteredRecipientsList = this.recipientsList.filter(r =>
          (r.email && r.email.toLowerCase().indexOf(criteria) != -1) ||
          (r.name && r.name.toLowerCase().indexOf(criteria) != -1));
      }
    }
  }

  edit(id: string) {
    this.router.navigateByUrl('/manage-notification-recipient/' + id);
  }

  delete(id) {
    if (confirm('Are you sure you want to delete this notification recipient?')) {
      this.blockUI.start('Deleting...');
      this.recipientService.deleteNotificationRecipient(id).subscribe(
        data => {
          if (data) {
            this.getRecipients();
          }
          this.blockUI.stop();
        },
        error => {
          this.blockUI.stop();
        }
      );
    }
  }

  toggleActive(recipient) {
    this.blockUI.start('Updating...');
    var model = {
      email: recipient.email,
      name: recipient.name,
      isActive: !recipient.isActive
    };
    this.recipientService.updateNotificationRecipient(recipient.id.toString(), model).subscribe(
      data => {
        if (data) {
          this.getRecipients();
        }
        this.blockUI.stop();
      },
      error => {
        this.blockUI.stop();
      }
    );
  }
}
