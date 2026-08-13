import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { LocationService } from '../services/location.service';

@Component({
  selector: 'app-cascading-location-picker',
  templateUrl: './cascading-location-picker.component.html',
  styleUrls: ['./cascading-location-picker.component.css']
})
export class CascadingLocationPickerComponent implements OnInit {
  @Input() showLabels: boolean = true;
  @Input() required: boolean = false;
  @Input() resetTrigger: number = 0;
  @Output() locationSelected = new EventEmitter<number>();
  @Output() locationChanged = new EventEmitter<void>();

  cascadingStates: any[] = [];
  cascadingRegions: any[] = [];
  cascadingDistricts: any[] = [];
  selectedStateId: number = null;
  selectedRegionId: number = null;
  selectedDistrictId: number = null;

  constructor(private locationService: LocationService) { }

  ngOnInit() {
    this.loadStates();
  }

  ngOnChanges() {
    if (this.resetTrigger > 0) {
      this.resetSelection();
    }
  }

  loadStates() {
    this.locationService.getStates().subscribe(
      data => {
        this.cascadingStates = (data || []).filter(l => l.isUnAttributed == false);
      },
      error => {
        console.log('Error loading states:', error);
      }
    );
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
    this.emitSelection();
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
    this.emitSelection();
  }

  onDistrictChange() {
    this.emitSelection();
  }

  emitSelection() {
    var selectedId = this.selectedDistrictId || this.selectedRegionId || this.selectedStateId;
    this.locationSelected.emit(selectedId || 0);
    this.locationChanged.emit();
  }

  resetSelection() {
    this.selectedStateId = null;
    this.selectedRegionId = null;
    this.selectedDistrictId = null;
    this.cascadingRegions = [];
    this.cascadingDistricts = [];
    this.locationSelected.emit(0);
  }

  getSelectedLocationId(): number {
    return this.selectedDistrictId || this.selectedRegionId || this.selectedStateId || 0;
  }
}
