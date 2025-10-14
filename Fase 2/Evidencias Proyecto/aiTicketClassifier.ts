// src/lib/aiTicketClassifier.ts
'use client';

export interface TicketForClassification {
  id: string;
  description: string;
  tags: string[];
  is_urgent: boolean;
  created_at: string;
}

export interface UrgencyScore {
  ticketId: string;
  score: number;
  level: 'high' | 'medium' | 'low';
  reasons: string[];
}

// Palabras clave para diferentes niveles de urgencia
const URGENCY_KEYWORDS = {
  high: [
    'no funciona', 'caído', 'crítico', 'urgente', 'emergencia', 'parado', 
    'bloqueado', 'error grave', 'no inicia', 'caída', 'inaccesible',
    'prioritario', 'inmediato', 'urgentemente', 'asap', 'rápido'
  ],
  medium: [
    'lento', 'problema', 'error', 'falla', 'no puedo', 'dificultad',
    'incidente', 'consultar', 'pregunta', 'ayuda', 'soporte',
    'molesto', 'incomodo', 'difícil', 'complicado'
  ],
  low: [
    'consulta', 'pregunta', 'información', 'sugerencia', 'mejora',
    'futuro', 'próximo', 'cuando', 'duda', 'curiosidad',
    'opcional', 'cuando pueda', 'sin prisa'
  ]
};

// Términos técnicos que aumentan urgencia
const TECHNICAL_TERMS = [
  'servidor', 'base de datos', 'red', 'wifi', 'internet', 'conexión',
  'sistema', 'aplicación', 'plataforma', 'login', 'acceso',
  'impresora', 'proyector', 'notebook', 'equipo', 'dispositivo'
];

export class TicketClassifier {
  
  // Calcular similitud de coseno entre dos textos
  private static cosineSimilarity(text1: string, text2: string): number {
    const words1 = this.tokenize(text1);
    const words2 = this.tokenize(text2);
    
    const allWords = [...new Set([...words1, ...words2])];
    
    const vector1 = allWords.map(word => 
      words1.filter(w => w === word).length
    );
    const vector2 = allWords.map(word => 
      words2.filter(w => w === word).length
    );
    
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
  }
  
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }
  
  // Analizar urgencia basada en palabras clave
  private static analyzeKeywords(description: string, tags: string[]): number {
    let score = 0;
    const fullText = `${description} ${tags.join(' ')}`.toLowerCase();
    
    // Palabras de alta urgencia
    URGENCY_KEYWORDS.high.forEach(keyword => {
      if (fullText.includes(keyword)) {
        score += 3;
      }
    });
    
    // Palabras de media urgencia
    URGENCY_KEYWORDS.medium.forEach(keyword => {
      if (fullText.includes(keyword)) {
        score += 1.5;
      }
    });
    
    // Palabras de baja urgencia (restan puntuación)
    URGENCY_KEYWORDS.low.forEach(keyword => {
      if (fullText.includes(keyword)) {
        score -= 1;
      }
    });
    
    // Términos técnicos aumentan urgencia
    TECHNICAL_TERMS.forEach(term => {
      if (fullText.includes(term)) {
        score += 0.5;
      }
    });
    
    return Math.max(0, score);
  }
  
  // Analizar patrones de tiempo
  private static analyzeTimePatterns(description: string): number {
    const timePatterns = [
      /(\d+)\s*(horas?|hrs?)\s*(sin|sin poder)/i,
      /desde\s*(ayer|esta mañana|hoy temprano)/i,
      /todo el día/i,
      /varios días/i,
      /desde hace/i
    ];
    
    let score = 0;
    timePatterns.forEach(pattern => {
      if (pattern.test(description)) {
        score += 2;
      }
    });
    
    return score;
  }
  
  // Analizar etiquetas específicas
  private static analyzeTags(tags: string[]): number {
    const urgentTags = ['urgente', 'critico', 'bloqueante', 'prioritario'];
    const mediumTags = ['problema', 'error', 'falla'];
    
    let score = 0;
    
    tags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      if (urgentTags.some(ut => tagLower.includes(ut))) {
        score += 3;
      } else if (mediumTags.some(mt => tagLower.includes(mt))) {
        score += 1.5;
      }
    });
    
    return score;
  }
  
  // Clasificar ticket y calcular puntuación de urgencia
  static classifyTicket(ticket: TicketForClassification): UrgencyScore {
    let score = 0;
    const reasons: string[] = [];
    
    // 1. Análisis de palabras clave
    const keywordScore = this.analyzeKeywords(ticket.description, ticket.tags);
    score += keywordScore;
    if (keywordScore > 0) {
      reasons.push(`Contiene palabras clave de urgencia (${keywordScore} pts)`);
    }
    
    // 2. Análisis de patrones de tiempo
    const timeScore = this.analyzeTimePatterns(ticket.description);
    score += timeScore;
    if (timeScore > 0) {
      reasons.push(`Menciona problemas de tiempo prolongado (${timeScore} pts)`);
    }
    
    // 3. Análisis de etiquetas
    const tagScore = this.analyzeTags(ticket.tags);
    score += tagScore;
    if (tagScore > 0) {
      reasons.push(`Etiquetas indican urgencia (${tagScore} pts)`);
    }
    
    // 4. Ticket marcado manualmente como urgente
    if (ticket.is_urgent) {
      score += 5;
      reasons.push('Usuario marcó como urgente (5 pts)');
    }
    
    // 5. Similitud con tickets históricos urgentes
    const historicalSimilarity = this.calculateHistoricalSimilarity(ticket);
    score += historicalSimilarity * 2;
    if (historicalSimilarity > 0.3) {
      reasons.push(`Similar a tickets históricos urgentes (${historicalSimilarity.toFixed(2)} sim)`);
    }
    
    // Determinar nivel de urgencia
    let level: 'high' | 'medium' | 'low';
    if (score >= 8) {
      level = 'high';
    } else if (score >= 4) {
      level = 'medium';
    } else {
      level = 'low';
    }
    
    return {
      ticketId: ticket.id,
      score,
      level,
      reasons
    };
  }
  
  // Similitud con patrones históricos (simplificado)
  private static calculateHistoricalSimilarity(ticket: TicketForClassification): number {
    const historicalPatterns = [
      "no funciona el sistema no puedo trabajar",
      "error crítico servidor caído",
      "urgencia inmediata bloqueado completamente",
      "problema grave impresora no imprime urgente"
    ];
    
    let maxSimilarity = 0;
    const ticketText = `${ticket.description} ${ticket.tags.join(' ')}`.toLowerCase();
    
    historicalPatterns.forEach(pattern => {
      const similarity = this.cosineSimilarity(ticketText, pattern);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    });
    
    return maxSimilarity;
  }
  
  // Ordenar tickets por urgencia
  static sortTicketsByUrgency(tickets: TicketForClassification[]): TicketForClassification[] {
    const ticketsWithScores = tickets.map(ticket => ({
      ticket,
      score: this.classifyTicket(ticket)
    }));
    
    return ticketsWithScores
      .sort((a, b) => b.score.score - a.score.score)
      .map(item => item.ticket);
  }
}