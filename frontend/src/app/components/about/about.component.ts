import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { WebsocketService } from '@app/services/websocket.service';
import { SeoService } from '@app/services/seo.service';
import { OpenGraphService } from '@app/services/opengraph.service';
import { StateService } from '@app/services/state.service';
import { HOLIDAYS } from '@app/shared/holidays';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent implements OnInit {
  frontendGitCommitHash = this.stateService.env.GIT_COMMIT_HASH;
  packetJsonVersion = this.stateService.env.PACKAGE_JSON_VERSION;
  holidayLogos = [{ id: 'default', name: 'Block Master' }, ...HOLIDAYS.map((h) => ({ id: h.id, name: h.name }))];

  constructor(
    private websocketService: WebsocketService,
    private seoService: SeoService,
    private ogService: OpenGraphService,
    public stateService: StateService,
  ) { }

  ngOnInit() {
    this.seoService.setTitle($localize`:@@004b222ff9ef9dd4771b777950ca1d0e4cd4348a:About`);
    this.seoService.setDescription('About Block Master: a friendly, self-hosted Bitcoin explorer for your own node, based on The Mempool Open Source Project (AGPL-3.0).');
    this.ogService.setManualOgImage('block-master-preview.png');
    this.websocketService.want(['blocks']);
  }
}
