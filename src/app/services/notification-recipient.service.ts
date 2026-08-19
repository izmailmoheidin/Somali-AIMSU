import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { UrlHelperService } from './url-helper-service';
import { catchError } from 'rxjs/operators';
import { StoreService } from './store-service';
import { httpOptions } from '../config/httpoptions';

@Injectable({
    providedIn: 'root'
})
export class NotificationRecipientService {

    constructor(private httpClient: HttpClient, private urlHelper: UrlHelperService,
        private storeService: StoreService) { }

    getNotificationRecipients() {
        var url = this.urlHelper.getNotificationRecipientsUrl();
        return this.httpClient.get(url, httpOptions).pipe(
            catchError(this.storeService.handleError<any>('Notification Recipients')));
    }

    addNotificationRecipient(model: any) {
        var url = this.urlHelper.getNotificationRecipientsUrl();
        return this.httpClient.post(url, JSON.stringify(model), httpOptions).pipe(
            catchError(this.storeService.handleError<any>('Add Notification Recipient')));
    }

    updateNotificationRecipient(id: string, model: any) {
        var url = this.urlHelper.getSingleNotificationRecipientUrl(id);
        return this.httpClient.put(url, JSON.stringify(model), httpOptions).pipe(
            catchError(this.storeService.handleError<any>('Update Notification Recipient')));
    }

    deleteNotificationRecipient(id: string) {
        var url = this.urlHelper.getSingleNotificationRecipientUrl(id);
        return this.httpClient.delete(url, httpOptions).pipe(
            catchError(this.storeService.handleError<any>('Delete Notification Recipient')));
    }
}
