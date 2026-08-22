import { Component, OnInit } from '@angular/core';
import { EnvelopeService } from '../services/envelope-service';
import { EnvelopeTypeService } from '../services/envelope-type.service';
import { OrganizationService } from '../services/organization-service';
import { FinancialYearService } from '../services/financial-year.service';
import { StoreService } from '../services/store-service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Settings } from '../config/settings';

@Component({
  selector: 'app-envelopes',
  templateUrl: './envelopes.component.html',
  styleUrls: ['./envelopes.component.css']
})
export class EnvelopesComponent implements OnInit {

  envelopesList: any = [];
  filteredList: any = [];
  organizationsList: any = [];
  envelopeTypesList: any = [];
  yearsList: any = [];
  isLoading: boolean = false;
  pagingSize: number = Settings.rowsPerPage;
  p: number = 1;

  selectedOrganization: string = '';
  selectedEnvelopeType: string = '';
  selectedYear: string = '';
  searchText: string = '';

  organizationsSettings: any = {};
  envelopeTypeSettings: any = {};

  @BlockUI() blockUI: NgBlockUI;
  constructor(private envelopeService: EnvelopeService,
    private envelopeTypeService: EnvelopeTypeService,
    private orgService: OrganizationService,
    private yearsService: FinancialYearService,
    private storeService: StoreService) { }

  ngOnInit() {
    this.storeService.newReportItem(Settings.dropDownMenus.reports);
    this.loadEnvelopes();
    this.loadEnvelopeTypes();
    this.loadOrganizations();
    this.loadYears();
  }

  loadEnvelopes() {
    this.isLoading = true;
    this.blockUI.start('Loading envelopes...');
    this.envelopeService.getAllEnvelopesFlat().subscribe(
      data => {
        if (data) {
          this.envelopesList = data;
          this.filteredList = [...this.envelopesList];
        }
        this.isLoading = false;
        this.blockUI.stop();
      },
      error => {
        this.isLoading = false;
        this.blockUI.stop();
      }
    );
  }

  loadEnvelopeTypes() {
    this.envelopeTypeService.getAllEnvelopeTypes().subscribe(
      data => {
        if (data) {
          this.envelopeTypesList = data;
        }
      }
    );
  }

  loadOrganizations() {
    this.orgService.getOrganizationsList().subscribe(
      data => {
        if (data) {
          this.organizationsList = data;
        }
      }
    );
  }

  loadYears() {
    this.yearsService.getYearsList().subscribe(
      data => {
        if (data) {
          this.yearsList = data;
        }
      }
    );
  }

  applyFilters() {
    this.filteredList = this.envelopesList.filter(e => {
      if (this.selectedOrganization && e.funderName !== this.selectedOrganization) {
        return false;
      }
      if (this.selectedEnvelopeType && e.envelopeType !== this.selectedEnvelopeType) {
        return false;
      }
      if (this.selectedYear && String(e.year) !== this.selectedYear) {
        return false;
      }
      if (this.searchText) {
        var search = this.searchText.toLowerCase();
        if (!e.funderName.toLowerCase().includes(search) &&
            !e.envelopeType.toLowerCase().includes(search)) {
          return false;
        }
      }
      return true;
    });
  }

  onOrganizationChange() {
    this.applyFilters();
  }

  onEnvelopeTypeChange() {
    this.applyFilters();
  }

  onYearChange() {
    this.applyFilters();
  }

  onSearchInput() {
    this.applyFilters();
  }

  resetFilters() {
    this.selectedOrganization = '';
    this.selectedEnvelopeType = '';
    this.selectedYear = '';
    this.searchText = '';
    this.filteredList = [...this.envelopesList];
  }

  get isAnyFilterSet(): boolean {
    return !!(this.selectedOrganization || this.selectedEnvelopeType || this.selectedYear || this.searchText);
  }

  formatNumber(value: number) {
    return this.storeService.getNumberWithCommas(Math.trunc(value || 0));
  }
}
