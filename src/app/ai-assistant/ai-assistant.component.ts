import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AIAssistantService } from 'src/app/services/ai-assistant-service';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatExchange {
  question: string;
  answer: string;
  chartLabels: string[];
  chartData: any[];
  chartType: string;
  sources: string[];
  isLoading: boolean;
  modelUsed: string;
}

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css']
})
export class AIAssistantComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('textareaInput') textareaInput!: ElementRef;

  question: string = '';
  conversations: ChatExchange[] = [];
  isSending: boolean = false;
  errorMessage: string = '';

  selectedModel: string = 'quick';
  modelOptions = [
    { value: 'quick', label: 'Quick Answer', modelId: '' },
    { value: 'detailed', label: 'Detailed Analysis', modelId: 'anthropic/claude-sonnet-4' }
  ];

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };
  chartLegend: boolean = true;

  suggestedQuestions: string[] = [
    'Show me funding by sector',
    "What's the latest project?",
    'How much did Germany fund?',
    'Find projects about water',
    'Show me funding by year',
    'Show me disbursement trends'
  ];

  private shouldScroll: boolean = false;

  constructor(private aiAssistantService: AIAssistantService) { }

  ngOnInit() {
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
    this.autoResize();
  }

  getModelLabel(): string {
    const opt = this.modelOptions.find(m => m.value === this.selectedModel);
    return opt ? opt.label : 'Quick Answer';
  }

  getModelId(): string {
    const opt = this.modelOptions.find(m => m.value === this.selectedModel);
    return opt ? opt.modelId : '';
  }

  askQuestion() {
    if (!this.question.trim() || this.isSending) {
      return;
    }

    const currentQuestion = this.question.trim();
    this.question = '';
    this.errorMessage = '';
    this.shouldScroll = true;

    const exchange: ChatExchange = {
      question: currentQuestion,
      answer: '',
      chartLabels: [],
      chartData: [],
      chartType: 'bar',
      sources: [],
      isLoading: true,
      modelUsed: this.getModelLabel()
    };
    this.conversations.push(exchange);
    this.isSending = true;

    const history: ChatMessage[] = [];
    for (const conv of this.conversations) {
      if (conv === exchange) break;
      history.push({ role: 'user', content: conv.question });
      history.push({ role: 'assistant', content: conv.answer });
    }

    const modelId = this.getModelId();

    this.aiAssistantService.ask(currentQuestion, history, modelId || undefined).subscribe({
      next: (response: any) => {
        exchange.isLoading = false;
        this.isSending = false;
        this.shouldScroll = true;
        if (response) {
          exchange.answer = response.answer || '';
          exchange.sources = response.sources || [];

          if (response.chartSpec && response.chartSpec.data) {
            exchange.chartLabels = response.chartSpec.data.labels || [];
            exchange.chartType = response.chartSpec.type || 'bar';
            if (response.chartSpec.data.datasets && response.chartSpec.data.datasets.length > 0) {
              exchange.chartData = response.chartSpec.data.datasets.map((ds: any) => ({
                data: ds.data,
                label: ds.label
              }));
            }
          }
        }
      },
      error: (error: any) => {
        exchange.isLoading = false;
        this.isSending = false;
        exchange.answer = 'Something went wrong. Please try again.';
      }
    });
  }

  useSuggestedQuestion(q: string) {
    this.question = q;
    this.askQuestion();
  }

  clearChat() {
    this.conversations = [];
    this.question = '';
    this.errorMessage = '';
  }

  onModelChange() {
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.askQuestion();
    }
  }

  onInput() {
    this.autoResize();
  }

  autoResize() {
    if (this.textareaInput) {
      const ta = this.textareaInput.nativeElement;
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }

  scrollToBottom() {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}

