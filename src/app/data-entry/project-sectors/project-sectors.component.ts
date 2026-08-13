import { Component, OnInit, Input, EventEmitter, Output, OnDestroy } from '@angular/core';
import { ProjectService } from 'src/app/services/project.service';
import { SectorService } from 'src/app/services/sector.service';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { StoreService } from 'src/app/services/store-service';
import { ErrorModalComponent } from 'src/app/error-modal/error-modal.component';
import { Messages } from 'src/app/config/messages';
import { Settings } from 'src/app/config/settings';
import { HelpService } from 'src/app/services/help-service';
import { SublocationModalComponent } from 'src/app/sublocation-modal/sublocation-modal.component';
import { LocationService } from 'src/app/services/location.service';

@Component({
  selector: 'project-sectors',
  templateUrl: './project-sectors.component.html',
  styleUrls: ['./project-sectors.component.css']
})
export class ProjectSectorsComponent implements OnInit, OnDestroy {

  @Input()
  projectId: number = 0;
  @Input()
  sectorTypesList: any = [];
  @Input()
  sectorsList: any = [];
  @Input()
  currentProjectSectors: any = [];
  @Input()
  defaultSectorsList: any = [];
  @Input()
  defaultSectorTypeId: number = 0;
  @Input()
  defaultSectorType: string = null;
  @Input()
  locationsList: any = [];
  @Input()
  subLocationsList: any = [];
  @Input()
  currentProjectLocations: any = [];
  
  @Input()
  aimsProjects: any = [];
  @Input()
  iatiProjects: any = [];

  @Output()
  projectSectorsChanged = new EventEmitter<any[]>();
  @Output()
  projectLocationsChanged = new EventEmitter<any[]>();
  @Output()
  proceedToNext = new EventEmitter();

  filteredSubLocationsList: any = this.subLocationsList;
  typeSectorsList: any = [];
  ndpSectorsList: any = [];

  // Cascading sector picker state
  cascadingPillars: any[] = [];
  cascadingChapters: any[] = [];
  cascadingKRAs: any[] = [];
  selectedPillarId: number = null;
  selectedChapterId: number = null;
  selectedKRAId: number = null;
  selectedSectorId: number = 0;
  sectorMappings: any = [];
  mappedSectorsList: any = [];
  newProjectSectors: any = [];
  sourceSectorsList: any = [];
  selectedSubLocations: any = [];
  settledSublocations: any = [];

  // Cascading location picker state
  cascadingStates: any[] = [];
  cascadingRegions: any[] = [];
  cascadingDistricts: any[] = [];
  selectedStateId: number = null;
  selectedRegionId: number = null;
  selectedDistrictId: number = null;
  sectorsSettings: any = {};
  subLocationsSettings: any = {};
  sectorsWithCodeSettings: any = {};
  sectorHelp: any = { sectorType: null, sector: null, mappingSector: null, percentage: null };
  locationHelp: any = { location: null, percentage: null };
  mappingsCount: number = 0;
  sourceSectorPercentage: number = 0;
  selectedLocationId: number = 0;
  requestNo: number = 0;
  currentTab: string = null;
  errorMessage: string = null;
  selectedLocationName: string = null;
  showMappingManual: boolean = false;
  showMappingAuto: boolean = false;
  showNdpMapping: boolean = false;
  isSectorsSourceAvailable: boolean = false;
  isLocationsSourceAvailable: boolean = false;
  isSectorHelpLoading: boolean = true;
  isLocationHelpLoading: boolean = true;
  isNdpSectorsLoading: boolean = true;
  isShowSubLocationsSettings: boolean = false;
  sectorModel: any = { sectorTypeId: null, sector: null, selectedSector: null, sectorId: null, selectedMapping: null, mappingId: null, fundsPercentage: null, saved: false };
  newMappings: any = [];
  locationModel: any = { locationId: null, location: null, selectedSubLocations: [], fundsPercentage: null, saved: false };

  sourceTypes: any = {
    IATI: 'IATI',
    AIMS: 'AIMS'
  }

  displayTabs: any = [
    { visible: true, identity: 'sectors-locations' },
    { visible: false, identity: 'sectors-source' },
    { visible: false, identity: 'locations-source' },
  ];

  tabConstants: any = {
    SECTORS_LOCATIONS: 'sectors-locations',
    SECTORS_SOURCE: 'sectors-source',
    LOCATIONS_SOURCE: 'locations-source'
  };
  
  @BlockUI() blockUI: NgBlockUI;
  constructor(private projectService: ProjectService, private sectorService: SectorService,
    private storeService: StoreService, private errorModal: ErrorModalComponent,
    private helpService: HelpService,
    private sublocationModal: SublocationModalComponent,
    private locationService: LocationService) { }

  ngOnInit() {
    this.requestNo = this.storeService.getNewRequestNumber();
    this.storeService.currentRequestTrack.subscribe(model => {
      if (model && this.requestNo == model.requestNo && model.errorStatus != 200) {
        this.blockUI.stop();
        this.errorMessage = model.errorMessage;
        this.errorModal.openModal();
      }
    });
    this.currentTab = this.tabConstants.SECTORS_LOCATIONS;
    
    this.sectorsSettings = {
      singleSelection: true,
      idField: 'id',
      textField: 'sectorWithCode',
      selectAllText: '',
      unSelectAllText: '',
      itemsShowLimit: 5,
      allowSearchFilter: true
    };
    
    this.subLocationsSettings = {
      singleSelection: false,
      idField: 'id',
      textField: 'subLocation',
      selectAllText: 'Select all',
      unSelectAllText: 'Unselect all',
      itemsShowLimit: 5,
      allowSearchFilter: true
    };

    this.getProjectSectorHelp();
    this.getProjectLocationHelp();
    if (this.currentProjectSectors.length == 0) {
      this.blockUI.start('Wait loading data...');
      this.getProjectSectors();
    }
    if (this.currentProjectLocations.length == 0) {
      if (!this.blockUI.isActive) {
        this.blockUI.start('Wait loading data...');
        this.getProjectLocations();
      }
    }
  }

  ngOnDestroy() {
    if (this.areUnSavedSectors()) {
      this.saveProjectSectors();
    }
    if (this.areUnSavedLocations()) {
      this.saveProjectLocations();
    }
  }

  getProjectSectorHelp() {
    this.helpService.getProjectSectorHelpFields().subscribe(
      data => {
        if (data) {
          this.sectorHelp = data;
        }
      }
    );
  }

  getProjectLocationHelp() {
    this.helpService.getProjectLocationHelpFields().subscribe(
      data => {
        if (data) {
          this.locationHelp = data;
        }
      }
    );
  }

  ngOnChanges() {
    this.iatiProjects.forEach(p => {
      if (p.sectors.length > 0) {
        this.isSectorsSourceAvailable = true;
        p.sectors.forEach((s) => {
          s.mappingId = 0;
        });
      }

      if (p.locations.length > 0) {
        this.isLocationsSourceAvailable = true;
      }
    });

    this.aimsProjects.forEach(p => {
      if (p.sectors.length > 0) {
        this.isSectorsSourceAvailable = true;
      }

      if (p.locations.length > 0) {
        this.isLocationsSourceAvailable = true;
      }
    });

    this.ndpSectorsList = this.buildHierarchicalSectorList(this.defaultSectorsList.filter(s => s.parentSector != null));
    if (this.ndpSectorsList.length > 0) {
      this.isNdpSectorsLoading = false;
    } 
    
    if (this.currentTab == this.tabConstants.SECTORS_SOURCE) {
      this.isNdpSectorsLoading = false;
      this.ndpSectorsList = this.buildHierarchicalSectorList(this.defaultSectorsList.filter(s => s.parentSector != null));
    }

    this.locationsList = this.locationsList.filter(l => l.isUnAttributed == false);
    this.cascadingStates = this.locationsList.filter(l => l.parentLocationId == null || l.parentLocationId == undefined);
  }

  getTypeSectorsList() {
    this.sectorModel.sectorId = null;
    this.showMappingAuto = false;
    this.showMappingManual = false;
    this.showNdpMapping = false;
    this.sectorModel.selectedSector = null;
    this.sectorModel.selectedMapping = null;

    if (!this.sectorModel.sectorTypeId || this.sectorModel.sectorTypeId == 'null') {
      this.typeSectorsList = [];
      this.cascadingPillars = [];
      this.cascadingChapters = [];
      this.cascadingKRAs = [];
      this.selectedPillarId = null;
      this.selectedChapterId = null;
      this.selectedKRAId = null;
      this.selectedSectorId = 0;
    } else {
      var typeSectorsList = this.sectorsList.filter(s => s.sectorTypeId == this.sectorModel.sectorTypeId);
      this.typeSectorsList = this.buildHierarchicalSectorList(typeSectorsList);
      this.initCascadingSectors();
    }
    this.getNDPSectors();
  }

  initCascadingSectors() {
    this.selectedPillarId = null;
    this.selectedChapterId = null;
    this.selectedKRAId = null;
    this.selectedSectorId = 0;
    this.cascadingChapters = [];
    this.cascadingKRAs = [];

    if (this.sectorModel.sectorTypeId && this.sectorModel.sectorTypeId != 'null') {
      this.cascadingPillars = this.sectorsList.filter(s =>
        s.sectorTypeId == this.sectorModel.sectorTypeId &&
        (!s.parentSectorId || s.parentSectorId == 0)
      );
    } else {
      this.cascadingPillars = [];
    }
  }

  onPillarChange() {
    this.selectedChapterId = null;
    this.selectedKRAId = null;
    this.cascadingKRAs = [];
    this.cascadingChapters = this.sectorsList.filter(s => s.parentSectorId == this.selectedPillarId);
    this.updateSelectedSector();
  }

  onChapterChange() {
    this.selectedKRAId = null;
    this.cascadingKRAs = this.sectorsList.filter(s => s.parentSectorId == this.selectedChapterId);
    this.updateSelectedSector();
  }

  onKRAChange() {
    this.updateSelectedSector();
  }

  updateSelectedSector() {
    var sectorId = this.selectedKRAId || this.selectedChapterId || this.selectedPillarId;
    if (sectorId) {
      this.selectedSectorId = sectorId;
      this.sectorModel.sectorId = sectorId;
      var sector = this.sectorsList.find(s => s.id == sectorId);
      if (sector) {
        this.sectorModel.sector = sector.sectorName;
      }
      if (this.sectorModel.sectorTypeId == this.defaultSectorTypeId) {
        this.sectorModel.mappingId = sectorId;
      } else {
 this.getSectorMappings();
      }
    } else {
      this.selectedSectorId = 0;
      this.sectorModel.sectorId = null;
      this.sectorModel.sector = null;
    }
  }

  getNDPSectors() {
    if (this.defaultSectorTypeId) {
      var ndpSectors = this.sectorsList.filter(s => s.sectorTypeId == this.defaultSectorTypeId && s.parentSectorId != 0);
      this.ndpSectorsList = this.buildHierarchicalSectorList(ndpSectors);
    }
  }

  buildHierarchicalSectorList(sectors: any[]): any[] {
    var sectorMap: any = {};
    var roots: any[] = [];
    var result: any[] = [];

    sectors.forEach(s => {
      sectorMap[s.id] = { ...s, children: [] };
    });

    sectors.forEach(s => {
      var node = sectorMap[s.id];
      if (s.parentSectorId && sectorMap[s.parentSectorId]) {
        sectorMap[s.parentSectorId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    var flatten = (nodes: any[], depth: number) => {
      nodes.forEach(node => {
        var prefix = '';
        if (depth === 0) {
          prefix = '\u25B8 ';
        } else if (depth === 1) {
          prefix = '\u00A0\u00A0\u25AA ';
        } else {
          prefix = '\u00A0\u00A0\u00A0\u00A0\u2022 ';
        }
        node.sectorWithCode = prefix + node.sectorName;
        result.push(node);
        if (node.children && node.children.length > 0) {
          flatten(node.children, depth + 1);
        }
      });
    };

    roots.sort((a, b) => a.sectorName.localeCompare(b.sectorName));
    flatten(roots, 0);
    return result;
  }

  getSectorMappings() {
    this.sectorModel.selectedMapping = null;
    if (this.defaultSectorTypeId != this.sectorModel.sectorTypeId) {
      if (this.selectedSectorId) {
        this.blockUI.start('Fetching sector mappings...');
        var sectorId = this.selectedSectorId.toString();
        this.mappingsCount = 0;
        this.sectorMappings = [];

        this.sectorService.getMappingsForSector(sectorId).subscribe(
          data => {
            if (data && data.length > 0) {
              this.showMappingManual = true;
              this.showMappingAuto = false;
              this.mappedSectorsList = data;
              this.ndpSectorsList = data;
              this.mappingsCount = data.length;
              if (data.length >= 1) {
                this.sectorModel.mappingId = data[0].id;
              }
            } else {
              this.mappingsCount = 0;
            }
            this.blockUI.stop();
          }
        );
      }
    }
  }

  getSectorMappingsByName() {
    if (this.defaultSectorTypeId != this.sectorModel.sectorTypeId) {
      var sectorName = this.sectorModel.sectorName;
      this.mappingsCount = 0;
      this.sectorMappings = [];

      this.sectorService.getMappingsForSectorByName(sectorName).subscribe(
        data => {
          if (data && data.length > 0) {
            this.showMappingManual = true;
            this.showMappingAuto = false;
            this.sectorMappings = data;
            this.mappedSectorsList = data;
            this.mappingsCount = data.length;
            if (data.length >= 1) {
              this.sectorModel.mappingId = data[0].id;
            }
          } else {
            this.mappingsCount = 0;
            this.sectorMappings = this.defaultSectorsList;
          }
        }
      );
    }
  }

  addSector(frm: any) {
    var sectorPercentage = parseFloat(this.sectorModel.fundsPercentage) + parseFloat(this.calculateRealSectorPercentage());
    if (sectorPercentage > 100) {
      this.errorMessage = Messages.INVALID_PERCENTAGE;
      this.errorModal.openModal();
      return false;
    }
    this.sectorModel.fundsPercentage = parseFloat(this.sectorModel.fundsPercentage.toFixed(2));

    if (!this.selectedSectorId) {
      this.errorMessage = 'Sector is required';
      this.errorModal.openModal();
      return false;
    }

    var mappingId = 0;
    if (this.sectorModel.sectorTypeId == this.defaultSectorTypeId) {
      mappingId = this.selectedSectorId;
    } else if (this.sectorModel.selectedMapping && this.sectorModel.selectedMapping.length > 0) {
      mappingId = this.sectorModel.selectedMapping[0].id;
    }

    var mappedSector = this.sectorsList.filter(s => s.id == mappingId);
    if (mappedSector.length > 0) {
      this.sectorModel.sector = mappedSector[0].sectorName;
    }

    var isSectorExists = [];
    isSectorExists = this.currentProjectSectors.filter(s => s.sectorId == this.selectedSectorId && s.saved == false);
    
    if (isSectorExists.length > 0) {
      isSectorExists[0].fundsPercentage += this.sectorModel.fundsPercentage;
    } else {
      this.sectorModel.sectorId = this.selectedSectorId;
      this.sectorModel.mappingId = mappingId;
      this.currentProjectSectors.unshift(this.sectorModel);
    }

    // Save immediately to backend
    this.saveProjectSectors();

    var sectorTypeId = this.sectorModel.sectorTypeId;
    this.sectorModel = { sectorTypeId: null, sectorId: null, mappingId: null, saved: false };
    this.mappingsCount = 0;
    this.sectorMappings = [];
    this.showNdpMapping = false;
    this.ndpSectorsList = this.buildHierarchicalSectorList(this.defaultSectorsList.filter(s => s.parentSector != null));
    // Reset cascading state
    this.selectedPillarId = null;
    this.selectedChapterId = null;
    this.selectedKRAId = null;
    this.selectedSectorId = 0;
    this.cascadingPillars = [];
    this.cascadingChapters = [];
    this.cascadingKRAs = [];
    frm.resetForm();
    setTimeout(() => {
      this.sectorModel.sectorTypeId = sectorTypeId;
      if (sectorTypeId && sectorTypeId != 'null') {
        this.initCascadingSectors();
      }
    },500);
  }

  addLocation(frm: any) {
    var locationPercentage = parseFloat(this.locationModel.fundsPercentage) + parseFloat(this.calculateRealLocationPercentage());
    if (locationPercentage > 100) {
      this.errorMessage = Messages.INVALID_PERCENTAGE;
      this.errorModal.openModal();
      return false;
    }

    this.locationModel.fundsPercentage = parseFloat(this.locationModel.fundsPercentage.toFixed(2));
    var mappedLocation = this.locationsList.filter(l => l.id == this.locationModel.locationId);
    if (mappedLocation.length > 0) {
      this.locationModel.location = mappedLocation[0].location;
    }

    var islocationExists = this.currentProjectLocations.filter(l => l.locationId == this.locationModel.locationId && l.saved == false);
    if (islocationExists.length > 0) {
      islocationExists[0].subLocations = this.locationModel.selectedSubLocations;
      islocationExists[0].fundsPercentage += this.locationModel.fundsPercentage;
    } else {
      this.locationModel.subLocations = this.locationModel.selectedSubLocations;
      this.currentProjectLocations.unshift(this.locationModel);
    }
    // Save immediately to backend
    this.saveProjectLocations();
    this.locationModel = { locationId: null, location: null, selectedSubLocations: [], subLocations: [], fundsPercentage: null, saved: false };
    // Reset cascading location state
    this.selectedStateId = null;
    this.selectedRegionId = null;
    this.selectedDistrictId = null;
    this.cascadingRegions = [];
    this.cascadingDistricts = [];
    frm.resetForm();
  }

  manageSubLocations() {
    this.locationModel.selectedSubLocations = [];
    if (this.locationModel.locationId) {
      var id = this.locationModel.locationId;
      this.filteredSubLocationsList = this.subLocationsList.filter(l => l.locationId == id);
    } else {
      this.locationModel.selectedSubLocations = [];
    }
  }

  onStateChange() {
    this.selectedRegionId = null;
    this.selectedDistrictId = null;
    this.cascadingDistricts = [];
    this.cascadingRegions = [];
    if (this.selectedStateId) {
      this.locationService.getLocationChildren(this.selectedStateId).subscribe(
        data => {
          this.cascadingRegions = data || [];
        },
        error => {
          console.log('Error loading regions:', error);
        }
      );
    }
    this.updateSelectedLocation();
  }

  onRegionChange() {
    this.selectedDistrictId = null;
    this.cascadingDistricts = [];
    if (this.selectedRegionId) {
      this.locationService.getLocationChildren(this.selectedRegionId).subscribe(
        data => {
          this.cascadingDistricts = data || [];
        },
        error => {
          console.log('Error loading districts:', error);
        }
      );
    }
    this.updateSelectedLocation();
  }

  onDistrictChange() {
    this.updateSelectedLocation();
  }

  updateSelectedLocation() {
    // The final selected location is the most specific one chosen (district > region > state)
    var selectedId = this.selectedDistrictId || this.selectedRegionId || this.selectedStateId;
    if (selectedId) {
      this.locationModel.locationId = selectedId;
      // Find the location name from the appropriate list
      var location = this.cascadingStates.find(l => l.id == selectedId);
      if (!location) {
        location = this.cascadingRegions.find(l => l.id == selectedId);
      }
      if (!location) {
        location = this.cascadingDistricts.find(l => l.id == selectedId);
      }
      if (location) {
        this.locationModel.location = location.location;
      }
    } else {
      this.locationModel.locationId = null;
      this.locationModel.location = null;
    }
  }

  openSubLocationsForLocation(id) {
    if (id) {
      this.selectedLocationId = id;
      var location = this.locationsList.filter(l => l.id == id);
      if (location.length > 0) {
        this.selectedLocationName = location[0].locationName;
        var projectLocation = this.currentProjectLocations.filter(l => l.locationId == id);
        if (projectLocation.length > 0) {
          if (projectLocation[0].subLocations.length > 0) {
            this.settledSublocations = projectLocation[0].subLocations;
          } else {
            this.settledSublocations = [];
          }
        }
      }
      this.selectedSubLocations = this.subLocationsList.filter(s => s.locationId == id);
      this.isShowSubLocationsSettings = true;
      this.sublocationModal.openModal();
    } else {
      this.selectedLocationId = 0;
    }
  }

  updateSubLocationsForLocation($event) {
    var subLocationData = $event;
    if (subLocationData) {
      var locationId = subLocationData.locationId;
      var selectedLocationArr = this.currentProjectLocations.filter(l => l.locationId == locationId);
      if (selectedLocationArr.length > 0) {
        var selectedLocation = selectedLocationArr[0];
        selectedLocation.subLocations = subLocationData.subLocations;
      } 
    }
    this.isShowSubLocationsSettings = false;
  }

  setManualMappings() {
    this.showMappingManual = false;
    this.showMappingAuto = true;
    this.getNDPSectors();
  }

  setAutomaticMappings() {
    this.ndpSectorsList = this.mappedSectorsList;
    this.showMappingAuto = false;
    this.showMappingManual = true;
  }

  removeProjectSector(id, isSomaliSector: boolean) {
    var filterSectorsList = [];
    if (isSomaliSector) {
      this.currentProjectSectors.forEach((s) => {
        if (s.saved) {
          filterSectorsList.push(s);
        } else if (!s.saved && s.mappingId != id) {
          filterSectorsList.push(s);
        }
      });
    } else {
      this.currentProjectSectors.forEach((s) => {
        if (s.saved) {
          filterSectorsList.push(s);
        } else if (!s.saved && s.sectorId != id) {
          filterSectorsList.push(s);
        }
      });
    }
    this.newMappings = this.newMappings.filter(m => m.sectorId != id);
    this.currentProjectSectors = filterSectorsList;
  }

  removeProjectLocation(id) {
    var filterLocationList = [];
    this.currentProjectLocations.forEach((l) => {
      if (l.saved) {
        filterLocationList.push(l);
      } else if (!l.saved && l.locationId != id) {
        filterLocationList.push(l);
      }
    });
    this.currentProjectLocations = filterLocationList;
  }

  deleteProjectSector(sectorId) {
    if (sectorId && this.projectId) {
      this.blockUI.start('Removing sector...');
      this.projectService.deleteProjectSector(this.projectId.toString(), sectorId).subscribe(
        data => {
          if (data) {
            this.currentProjectSectors = this.currentProjectSectors.filter(s => s.sectorId != sectorId);
            this.updateSectorsToParent();
            this.getProjectSectors();
            this.newMappings = this.newMappings.filter(m => m.sectorId != sectorId);
          }
        }
      );
    }
  }

  deleteProjectLocation(locationId) {
    if (locationId && this.projectId) {
      this.blockUI.start('Removing location...');
      this.projectService.deleteProjectLocation(this.projectId.toString(), locationId).subscribe(
        data => {
          if (data) {
            //this.currentProjectLocations = this.currentProjectLocations.filter(l => l.locationId != locationId);
            //this.updateLocationsToParent();
            this.getProjectLocations();
          }
        }
      );
    }
  }

  areUnSavedSectors() {
    return this.currentProjectSectors.filter(s => s.saved == false).length > 0 ? true : false;
  }

  areUnSavedLocations() {
    return this.currentProjectLocations.filter(l => l.saved == false).length > 0 ? true : false;
  }

  calculateSectorPercentage() {
    var percentageList = this.currentProjectSectors.map(s => parseFloat(s.fundsPercentage));
    return percentageList.reduce(this.storeService.sumValues, 0);
  }

  calculateRealSectorPercentage() {
    var realSectors = this.currentProjectSectors.filter(s => 
      !s.sector || s.sector.toUpperCase() !== 'UNATTRIBUTED');
    var percentageList = realSectors.map(s => parseFloat(s.fundsPercentage));
    return percentageList.reduce(this.storeService.sumValues, 0);
  }

  calculateLocationPercentage() {
    var percentageList = this.currentProjectLocations.map(l => parseFloat(l.fundsPercentage));
    return percentageList.reduce(this.storeService.sumValues, 0);
  }

  calculateRealLocationPercentage() {
    var realLocations = this.currentProjectLocations.filter(l => 
      !l.location || l.location.toUpperCase() !== 'UNATTRIBUTED');
    var percentageList = realLocations.map(l => parseFloat(l.fundsPercentage));
    return percentageList.reduce(this.storeService.sumValues, 0);
  }

  isUnattributedSector(sector: any): boolean {
    return sector && sector.sector && sector.sector.toUpperCase() === 'UNATTRIBUTED';
  }

  isUnattributedLocation(location: any): boolean {
    return location && location.location && location.location.toUpperCase() === 'UNATTRIBUTED';
  }

  editSectorPercentage(sector: any) {
    var newPercentage = parseFloat(sector.fundsPercentage);
    if (isNaN(newPercentage) || newPercentage < 1 || newPercentage > 100) {
      this.errorMessage = 'Percentage must be between 1 and 100';
      this.errorModal.openModal();
      return;
    }
    if (this.projectId && sector.sectorId) {
      this.blockUI.start('Updating sector percentage...');
      this.projectService.updateProjectSectorPercentage(this.projectId.toString(), sector.sectorId, newPercentage).subscribe(
        () => {
          this.getProjectSectors();
        },
        (error) => {
          this.blockUI.stop();
          this.errorMessage = error;
          this.errorModal.openModal();
        }
      );
    }
  }

  editLocationPercentage(location: any) {
    var newPercentage = parseFloat(location.fundsPercentage);
    if (isNaN(newPercentage) || newPercentage < 1 || newPercentage > 100) {
      this.errorMessage = 'Percentage must be between 1 and 100';
      this.errorModal.openModal();
      return;
    }
    if (this.projectId && location.locationId) {
      this.blockUI.start('Updating location percentage...');
      this.projectService.updateProjectLocationPercentage(this.projectId.toString(), location.locationId, newPercentage).subscribe(
        () => {
          this.getProjectLocations();
        },
        (error) => {
          this.blockUI.stop();
          this.errorMessage = error;
          this.errorModal.openModal();
        }
      );
    }
  }

  saveProjectSectors() {
    var unSavedSectors = this.currentProjectSectors.filter(s => !s.saved);
    if (unSavedSectors.length > 0 && this.projectId) {
      unSavedSectors.forEach(s => {
        if (!s.sectorId) {
          s.sectorTypeId = s.sectorTypeId;
          s.sectorId = s.mappingId;
        }
        if (s.sectorTypeId != this.defaultSectorTypeId && s.mappingId != 0 && s.sectorId != s.mappingId) {
          var exists = this.newMappings.filter(m => m.sectorId == s.sectorId && m.mappingId == s.mappingId);
          if (exists.length == 0) {
            this.newMappings.push({
              sectorTypeId: s.sectorTypeId,
              sectorId: s.sectorId,
              mappingId: s.mappingId
            });
          }
        }
      });

      unSavedSectors.forEach((s) => {
        s.sectorTypeId = parseInt(s.sectorTypeId);
        s.sectorId = parseInt(s.sectorId);
      });

      this.newMappings.forEach((m) => {
        m.sectorTypeId = parseInt(m.sectorTypeId);
        m.sectorId = parseInt(m.sectorId);
        m.mappingId = parseInt(m.mappingId);
      });

      var sectorIds = unSavedSectors.map(s => parseInt(s.sectorId));
      this.newMappings = this.newMappings.filter(m => sectorIds.includes(m.sectorId));
      var model = {
        projectId: this.projectId,
        projectSectors: unSavedSectors,
        newMappings: this.newMappings
      };
      this.blockUI.start('Saving sectors');
      this.projectService.addProjectSector(model).subscribe(
        data => {
          if (data) {
            this.getProjectSectors();    
          }
        }
      );
    }
  }

  saveSourceSectors() {
    if (this.sourceSectorsList.length > 0) {
      this.sourceSectorsList.forEach((s) => {
        s.sectorTypeId = parseInt(s.sectorTypeId);
      });
      var model = {
        projectId: this.projectId,
        projectSectors: this.sourceSectorsList,
        newMappings: []
      }

      this.blockUI.start('Saving sectors');
      this.projectService.addProjectSector(model).subscribe(
        data => {
          if (data) {
            this.getProjectSectors();  
            this.sourceSectorsList = [];
            setTimeout(() => {
              this.currentTab = this.tabConstants.SECTORS_LOCATIONS;
            }, 1000);  
            
          }
        }
      );
    }
  }

  saveProjectLocations() {
    var unSavedLocations = this.currentProjectLocations.filter(s => !s.saved);
    if (unSavedLocations.length > 0 && this.projectId) {
      unSavedLocations.forEach((l) => {
        l.locationId = parseInt(l.locationId);
      });
      var model = {
        projectId: this.projectId,
        projectLocations: unSavedLocations,
      };
      this.blockUI.start('Saving locations');
      this.projectService.addProjectLocation(model).subscribe(
        data => {
          if (data) {
            this.getProjectLocations();  
          }
        }
      );
    }
  }

  getProjectSectors() {
    this.projectService.getProjectSectors(this.projectId.toString()).subscribe(
      data => {
        if (data) {
          if (data.length > 0) {
            data.forEach(d => {
              d.saved = true;
            });
          }
          this.currentProjectSectors = data;
          this.currentProjectSectors.forEach((s) => {
            s.mappingId = s.sectorId
          });
          this.updateSectorsToParent();
        }
          this.blockUI.stop();
      }
    );
  }

  getProjectLocations() {
    this.projectService.getProjectLocations(this.projectId.toString()).subscribe(
      data => {
        if (data) {
          if (data.length > 0) {
            data.forEach(d => {
              d.saved = true;
            });
          }
          this.currentProjectLocations = data;
          this.updateLocationsToParent();
        }
        this.blockUI.stop();
      }
    );
  }

  showSectorsSource() {
    this.currentTab = this.tabConstants.SECTORS_SOURCE;
  }

  showSectorsLocations() {
    this.currentTab = this.tabConstants.SECTORS_LOCATIONS;
  }

  showLocationsSource() {
    this.currentTab = this.tabConstants.LOCATIONS_SOURCE;
  }

  checkIfSectorAdded(sectorName: string) {
    if (sectorName && this.currentProjectSectors.length > 0) {
      return this.currentProjectSectors.filter(s => s.sector.toLowerCase() == sectorName.toLowerCase()).length > 0 ? true : false;
    }
    return false;
  }

  addSourceSectorToList(projectId: number, sectorId: number, type: string, sectorCode: number = 0, iatiSector: string = null) {
    var isSectorAdded = this.sourceSectorsList.filter(s => s.mappingId == sectorId);
    if (isSectorAdded.length > 0) {
      this.sourceSectorsList = this.sourceSectorsList.filter(s => s.mappingId != sectorId);
    } else {
      this.calculateSectorPercentageForSource();
      if (type == this.sourceTypes.IATI) {
        var project = this.iatiProjects.filter(p => p.id == projectId);
        if (project.length > 0) {
          var sectors = project[0].sectors;
          if (sectors && sectors.length > 0) {
            var sector = sectors.filter(s => s.code == sectorCode);
            if (sector.length > 0) {
              var fundsPercentage = sector[0].fundsPercentage;
              var mappingId = sector[0].mappingId;
              var sectorName = sector[0].sector;
              var sectorTypeCode = sector[0].sectorTypeCode;
              var sectorId = 0;
              var sourceSector = [];
              fundsPercentage = parseFloat(fundsPercentage);

              if (!fundsPercentage || fundsPercentage < 1 || fundsPercentage > 100) {
                this.errorMessage = 'Sector percentage' + Messages.PERCENTAGE_RANGE;
                this.errorModal.openModal();
                return false;
              }

              var totalPercentage = this.sourceSectorPercentage + fundsPercentage;
              if (totalPercentage > 100) {
                this.errorMessage = Messages.INVALID_PERCENTAGE;
                this.errorModal.openModal();
                return false;
              }

              if (sectorName) {
                sourceSector = this.sectorsList.filter(s => s.sectorName.toLowerCase() == sectorName.toLowerCase());
                if (sourceSector.length > 0) {
                  sectorId = sourceSector[0].id;
                }
              }

              this.sourceSectorsList.push({
                sectorTypeId: this.defaultSectorTypeId,
                sectorId: sectorId,
                mappingId: parseInt(mappingId),
                sectorName: sectorName,
                sector: iatiSector,
                fundsPercentage: fundsPercentage
              });
            }
          }
        }
      } else if (type == this.sourceTypes.AIMS) {
        var project = this.aimsProjects.filter(p => p.id == projectId);
        if (project.length > 0) {
          var sectors = project[0].sectors;
          if (sectors && sectors.length > 0) {
            var sector = sectors.filter(s => s.sectorId == sectorId);
            if (sector.length > 0) {
              var fundsPercentage = sector[0].fundsPercentage;
              var mappingId = sector[0].sectorId;
              var sectorName = sector[0].sector;
              if (!fundsPercentage) {
                this.errorMessage = 'Sector percentage ' + Messages.PERCENTAGE_RANGE;
                this.errorModal.openModal();
                return false;
              }

              this.sourceSectorsList.push({
                sectorTypeId: this.defaultSectorTypeId,
                sectorId: mappingId,
                mappingId: mappingId,
                sector: sectorName,
                fundsPercentage: fundsPercentage
              });
            }
          }
        }
      }
    }
    this.calculateSectorPercentageForSource();
  }

  removeSourceSector(sectorId: number) {
    this.sourceSectorsList = this.sourceSectorsList.filter(s => s.mappingId != sectorId); 
  }

  calculateSectorPercentageForSource() {
    var fundsPercentage = 0;
    this.sourceSectorsList.forEach((s) => {
      fundsPercentage += s.fundsPercentage;
    });

    this.currentProjectSectors.forEach((s) => {
      fundsPercentage += s.fundsPercentage;
    });
    this.sourceSectorPercentage = fundsPercentage;
  }

  checkIfSectorInActionList(sectorId: number) {
    return this.sourceSectorsList.filter(s => s.mappingId == sectorId).length > 0 ? true : false;
  }

  proceedToMarkers() {
    if (this.currentProjectSectors.length == 0) {
      this.errorMessage = 'At least one sector is required. Please add a sector before proceeding.';
      this.errorModal.openModal();
      return false;
    }
    var unSavedSectors = this.currentProjectSectors.filter(s => !s.saved);
    if (unSavedSectors.length > 0) {
      this.errorMessage = 'You have unsaved sectors data. Please save data first before proceeding next.';
      this.errorModal.openModal();
      return false;
    }
    if (this.currentProjectLocations.length == 0) {
      this.errorMessage = 'At least one location is required. Please add a location before proceeding.';
      this.errorModal.openModal();
      return false;
    }
    var unSavedLocations = this.currentProjectLocations.filter(l => !l.saved);
    if (unSavedLocations.length > 0) {
      this.errorMessage = 'You have unsaved locations data. Please save data first before proceeding next.';
      this.errorModal.openModal();
      return false;
    }
    this.updateSectorsToParent();
    this.updateLocationsToParent();
    this.proceedToNext.emit();
  }

  displaySubLocations(subLocations: any = []) {
    var subLocationsStr = '';
    if (subLocations && subLocations.length > 0) {
      subLocationsStr = subLocations.map(l => l.subLocation).join(', ');
    }
    return subLocationsStr;
  }

  /*Sending updated data to parent*/
  updateSectorsToParent() {
    this.projectSectorsChanged.emit(this.currentProjectSectors);
  }

  updateLocationsToParent() {
    this.projectLocationsChanged.emit(this.currentProjectLocations);
  }

  onDeSelectSector() {
    this.sectorModel.selectedSector = null;
    this.sectorModel.selectedMapping = null;
    this.ndpSectorsList = this.defaultSectorsList.filter(s => s.parentSector != null);
    this.showMappingAuto = false;
    this.showMappingManual = false;
    this.mappingsCount = 0;
    this.selectedPillarId = null;
    this.selectedChapterId = null;
    this.selectedKRAId = null;
    this.selectedSectorId = 0;
    this.cascadingChapters = [];
    this.cascadingKRAs = [];
  }

}
