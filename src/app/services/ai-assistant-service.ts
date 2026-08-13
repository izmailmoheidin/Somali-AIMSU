import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UrlHelperService } from './url-helper-service';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StoreService } from './store-service';

@Injectable({
  providedIn: 'root'
})
export class AIAssistantService {
  constructor(private httpClient: HttpClient, private urlHelper: UrlHelperService,
    private storeService: StoreService) { }

  ask(question: string, history: any[] = [], modelOverride?: string): Observable<any> {
    const url = this.urlHelper.getAIAssistantAskUrl();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = JSON.stringify({ question, history, modelOverride: modelOverride || null });
    return this.httpClient.post(url, body, { headers }).pipe(
      catchError(this.storeService.handleError<any>('AI Assistant'))
    );
  }
}
