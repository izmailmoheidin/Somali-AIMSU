import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LocationService } from '../services/location.service';
import { ReportService } from '../services/report.service';
import { CurrencyService } from '../services/currency.service';
import { StoreService } from '../services/store-service';
import { SectorTypeService } from '../services/sector-types.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';

@Component({
  selector: 'app-state-profile',
  templateUrl: './state-profile.component.html',
  styleUrls: ['./state-profile.component.css']
})
export class StateProfileComponent implements OnInit, AfterViewInit, OnDestroy {
  stateId: number = 0;
  stateName: string = '';
  isLoading: boolean = true;

  // Summary stats
  totalProjects: number = 0;
  totalFunding: number = 0;
  uniqueFunders: number = 0;
  uniqueImplementers: number = 0;

  // Project list
  projectsList: any[] = [];
  pagingSize: number = 15;
  p: number = 1;

  // Sector breakdown
  sectorChartData: any = { labels: [], datasets: [] };
  sectorChartType: any = 'bar';
  sectorChartOptions: any = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ' ' + (this.defaultCurrencyCode || 'USD') + ' ' + this.abbreviateAmount(ctx.parsed.x) } } },
    scales: { x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, callback: (v: any) => this.abbreviateAmount(v) } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
  };

  // Top funders / implementers
  topFunders: any[] = [];
  topImplementers: any[] = [];

  // Map
  @ViewChild('stateMap') mapContainer!: ElementRef<HTMLDivElement>;
  map: any = null;

  // Currency
  defaultCurrency: string = 'USD';
  defaultCurrencyCode: string = 'USD';

  // Sector type selector
  sectorTypesList: any = [];
  selectedSectorTypeId: number = 0;

  // Region data
  regionColors: any = {
    'FGS': '#0b2545',
    'BRA': '#4189dd',
    'Galmudug': '#16a34a',
    'Hirshabelle': '#ea580c',
    'Jubaland': '#7c3aed',
    'Puntland': '#0891b2',
    'South West': '#db2777',
    'Somaliland': '#ca8a04',
    'North East': '#dc2626'
  };

  regionCoords: any = {
    'FGS': [2.5000, 45.8000],
    'BRA': [2.0700, 45.3000],
    'Galmudug': [5.5000, 47.0000],
    'Hirshabelle': [3.8000, 46.2000],
    'Jubaland': [0.5000, 42.2000],
    'Puntland': [8.3000, 49.0000],
    'South West': [2.8000, 43.5000],
    'Somaliland': [9.5000, 44.5000],
    'North East': [8.8000, 46.5000]
  };

  @BlockUI() blockUI: NgBlockUI;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private locationService: LocationService,
    private reportService: ReportService,
    private currencyService: CurrencyService,
    private storeService: StoreService,
    private sectorTypeService: SectorTypeService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.stateId = parseInt(params.get('id') || '0');
      if (!this.stateId) {
        this.router.navigate(['/home']);
        return;
      }
      this.resetState();
      this.getSectorTypesList();
      this.loadStateData();
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 200);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  resetState() {
    this.totalProjects = 0;
    this.totalFunding = 0;
    this.uniqueFunders = 0;
    this.uniqueImplementers = 0;
    this.projectsList = [];
    this.topFunders = [];
    this.topImplementers = [];
    this.sectorChartData = { labels: [], datasets: [] };
    this.p = 1;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  loadStateData() {
    this.isLoading = true;
    this.blockUI.start('Loading state profile...');

    this.currencyService.getDefaultCurrency().subscribe(currency => {
      if (currency) {
        this.defaultCurrency = currency.currencyName;
        this.defaultCurrencyCode = currency.currency;
      }
    });

    this.locationService.getLocationsList().subscribe(locations => {
      var loc = (locations || []).find((l: any) => l.id === this.stateId);
      if (loc) {
        this.stateName = loc.location;
      }
      this.loadProjectList();
      this.loadSectorBreakdown();
      this.loadTopOrganizations();
    }, error => {
      console.error('Error loading locations:', error);
      this.isLoading = false;
      this.blockUI.stop();
    });
  }

  loadProjectList() {
    var model = {
      projectIds: [],
      startingYear: 0,
      endingYear: 0,
      organizationIds: [],
      locationIds: [this.stateId],
      subLocationIds: [],
      sectorIds: [],
      description: '',
      lowerRange: 0,
      upperRange: 0
    };

    this.reportService.getLocationWiseProjectsReport(model).subscribe(data => {
      var locationProjects = (data && data.locationProjectsList) ? data.locationProjectsList : [];
      var stateData = locationProjects.find((lp: any) => lp.locationName === this.stateName);

      if (stateData && stateData.projects) {
        this.projectsList = stateData.projects;
        this.totalProjects = this.projectsList.length;
        this.totalFunding = stateData.totalFunding || 0;

        // Count unique funders and implementers
        var funderSet = new Set<string>();
        var implementerSet = new Set<string>();
        this.projectsList.forEach((p: any) => {
          if (p.funders) p.funders.split(',').forEach((f: string) => funderSet.add(f.trim()));
          if (p.implementers) p.implementers.split(',').forEach((i: string) => implementerSet.add(i.trim()));
        });
        this.uniqueFunders = funderSet.size;
        this.uniqueImplementers = implementerSet.size;
      }

      this.isLoading = false;
      this.blockUI.stop();
      setTimeout(() => this.initMap(), 100);
    }, error => {
      console.error('Error loading project list:', error);
      this.isLoading = false;
      this.blockUI.stop();
    });
  }

  loadSectorBreakdown() {
    var model = {
      projectIds: [],
      startingYear: 0,
      endingYear: 0,
      organizationIds: [],
      locationId: this.stateId,
      subLocationIds: [],
      sectorIds: [],
      sectorLevel: 1,
      sectorTypeId: this.selectedSectorTypeId || 0
    };

    this.reportService.getSectorWiseProjectsReport(model).subscribe(data => {
      var sectors = (data && data.sectorProjectsList) ? data.sectorProjectsList : [];
      sectors = sectors.filter((s: any) => s.sectorName !== 'Unattributed Sector' || s.totalFunding > 0);
      sectors = sectors.sort((a: any, b: any) => b.totalFunding - a.totalFunding).slice(0, 12);

      this.sectorChartData = {
        labels: sectors.map((s: any) => this.shortenLabel(s.sectorName, 30)),
        datasets: [{
          data: sectors.map((s: any) => Math.round(s.totalFunding)),
          backgroundColor: '#4189dd',
          borderRadius: 4,
          barThickness: 16
        }]
      };
    }, error => {
      console.error('Error loading sector breakdown:', error);
    });
  }

  getSectorTypesList() {
    this.sectorTypeService.getSectorTypesList().subscribe(
      data => {
        if (data) {
          this.sectorTypesList = data;
          var defaultType = data.filter((t: any) => t.isPrimary == true);
          if (defaultType.length > 0) {
            this.selectedSectorTypeId = defaultType[0].id;
          }
        }
      }
    );
  }

  onSectorTypeChange() {
    this.loadSectorBreakdown();
  }

  loadTopOrganizations() {
    var model = {
      projectIds: [],
      startingYear: 0,
      endingYear: 0,
      organizationIds: [],
      locationId: this.stateId,
      subLocationIds: [],
      sectorIds: [],
      sectorLevel: 1
    };

    this.reportService.getOrganizationWiseProjectsReport(model).subscribe(data => {
      var orgs = (data && data.organizationProjectsList) ? data.organizationProjectsList : [];
      // Filter out orgs with 0 projects (safety)
      orgs = orgs.filter((o: any) => o.projects && o.projects.length > 0);

      // Top funders (already only funders per the API logic)
      this.topFunders = orgs
        .sort((a: any, b: any) => b.totalFunding - a.totalFunding)
        .slice(0, 10);

      // For implementers, we need a separate approach — the org report only covers funders.
      // We'll derive implementers from the project list's implementers field.
      // But since we have structured org data for funders, let's use that for now.
      // Implementers will be populated from the project list client-side as a secondary list.
      this.deriveTopImplementers();
    }, error => {
      console.error('Error loading top organizations:', error);
      this.deriveTopImplementers();
    });
  }

  deriveTopImplementers() {
    // Aggregate implementers from project list
    var implMap: { [key: string]: { name: string, count: number, funding: number } } = {};
    this.projectsList.forEach((p: any) => {
      if (p.implementers) {
        p.implementers.split(',').forEach((name: string) => {
          name = name.trim();
          if (name) {
            if (!implMap[name]) {
              implMap[name] = { name, count: 0, funding: 0 };
            }
            implMap[name].count++;
            implMap[name].funding += p.projectValue || 0;
          }
        });
      }
    });
    this.topImplementers = Object.values(implMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  initMap() {
    const L = (window as any).L;
    if (this.map || !this.mapContainer) return;

    var coords = this.regionCoords[this.stateName] || [5.1521, 46.1996];
    this.map = L.map(this.mapContainer.nativeElement, { scrollWheelZoom: false }).setView(coords, 7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, minZoom: 4, crossOrigin: 'anonymous',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Add a single marker for this state
    var regionColor = this.regionColors[this.stateName] || '#4189dd';
    var radius = 10 + Math.min(18, Math.sqrt(this.totalProjects));
    var marker = L.circleMarker(coords, {
      radius, color: '#ffffff', weight: 2,
      fillColor: regionColor, fillOpacity: 0.85
    }).addTo(this.map);
    marker.bindTooltip(this.stateName, { direction: 'top' });
    marker.bindPopup('<div style="min-width:170px"><b>' + this.stateName + '</b><br/>Projects: ' + this.totalProjects + '<br/>Total funding: ' + (this.defaultCurrencyCode || 'USD') + ' ' + this.formatNumberWithCommas(Math.round(this.totalFunding)) + '</div>');

    setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 200);
  }

  shortenLabel(label: string, maxLength: number) {
    if (!label) return '';
    return (label.length > maxLength) ? (label.substring(0, maxLength) + '\u2026') : label;
  }

  abbreviateAmount(value: any) {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value;
  }

  formatNumber(value: number) {
    if (!value) return 0;
    if (!isNaN(value) && value > 0) {
      return this.storeService.getNumberWithCommas(value);
    }
    return value;
  }

  formatNumberWithCommas(value: number) {
    return this.storeService.getNumberWithCommas(value);
  }

  viewProject(projectId: number) {
    this.router.navigate(['/view-project', projectId]);
  }
}
