import { Component } from '@angular/core';
import { Env, StateService } from '@app/services/state.service';
import { SeoService } from '@app/services/seo.service';
import { OpenGraphService } from '@app/services/opengraph.service';

@Component({
  selector: 'app-trademark-policy',
  templateUrl: './trademark-policy.component.html',
  styleUrls: ['./trademark-policy.component.scss'],
  standalone: false,
})
export class TrademarkPolicyComponent {
  officialMempoolSpace = this.stateService.env.OFFICIAL_MEMPOOL_SPACE;

  constructor(
    private stateService: StateService,
    private seoService: SeoService,
    private ogService: OpenGraphService,
  ) { }

  ngOnInit(): void {
    this.seoService.setTitle('Trademarks & Attribution');
    this.seoService.setDescription('Block Master is an independent fork of The Mempool Open Source Project (AGPL-3.0) and is not affiliated with mempool.space.');
    this.ogService.setManualOgImage('block-master-preview.png');
  }
}
