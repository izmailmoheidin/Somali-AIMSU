import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UrlHelperService } from './url-helper-service';
import { httpOptions } from '../config/httpoptions';
import { StoreService } from './store-service';
import { map, catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SponsorLogoService {

  constructor(private httpClient: HttpClient,
    private urlHelper: UrlHelperService,
    private storeService: StoreService) { }

  uploadAndSaveLogo(file: File, title: string): Observable<HttpEvent<any>> {
    const formData: FormData = new FormData();

    formData.append('Logo', file);
    formData.append('title', title);
    var url = this.urlHelper.getSponsorLogoUrl();
    const req = new HttpRequest('POST', url, formData, {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + localStorage.getItem("token")
      }),
      reportProgress: true,
      responseType: 'json'
    });

    return this.httpClient.request(req);
  }

  getLogos() {
    var url = this.urlHelper.getSponsorLogoUrl();
    return this.httpClient
      .get(url, httpOptions).pipe(
        catchError(this.storeService.handleError<any>('Sponsor logos'))
      );
  }

  deleteSponsor(id: string) {
    var url = this.urlHelper.getSponsorLogoUrl() + '/' + id;
    return this.httpClient.delete(url, httpOptions).pipe(
      catchError(this.storeService.handleError<any>('Sponsor')));
  }
  
}
