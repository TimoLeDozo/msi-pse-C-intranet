// config/swagger.config.js
/**
 * Configuration Swagger/OpenAPI pour MSI Propales
 * Accessible sur /api-docs
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MSI Propales API',
      version: '1.0.0',
      description: `
## 🚀 API de Génération de Propositions Commerciales

Cette API permet de transformer des notes brutes de rendez-vous commerciaux
en propositions commerciales professionnelles (PDF) via l'IA locale Ollama.

### Flux d'utilisation
1. **POST /auth/login** - Authentification
2. **POST /api/proposal/preview** - Pré-génère le contenu IA (éditable)
3. **POST /api/proposal/generate** - Génère les documents finaux
4. **GET /files/:filename** - Télécharge les documents

### Authentification
Session-based via cookie \`msi.sid\` après POST /auth/login

### Coûts IA
Chaque appel preview/generate retourne le coût estimé en temps machine de l'inférence Ollama.
      `,
      contact: {
        name: 'Tim - Icam Engineering',
        email: 'tim.cagin@gmail.com'
      },
      license: {
        name: 'MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement'
      }
    ],
    tags: [
      { name: 'Auth', description: 'Authentification utilisateur' },
      { name: 'Proposal', description: 'Génération de propositions commerciales' },
      { name: 'Files', description: 'Téléchargement des documents générés' }
    ],
    components: {
      schemas: {
        // === ENTRÉES ===
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'admin' },
            password: { type: 'string', example: 'password123' }
          }
        },
        
        ProposalInput: {
          type: 'object',
          required: ['entrepriseNom'],
          properties: {
            titre: { type: 'string', example: 'Optimisation flux logistique' },
            thematique: { type: 'string', example: 'Logistique & Supply Chain' },
            entrepriseNom: { type: 'string', example: 'Velibor SA', description: 'Nom entreprise (requis)' },
            entrepriseAdresse: { type: 'string', example: '123 rue de Paris, 75001 Paris' },
            codeProjet: { type: 'string', example: 'VEL-2026-001' },
            dateDebut: { type: 'string', format: 'date', example: '2026-02-15' },
            nbEquipes: { type: 'integer', example: 2, minimum: 1, maximum: 10 },
            dureeSemaines: { type: 'integer', example: 24, minimum: 1, maximum: 52 },
            clientNom: { type: 'string', example: 'Jean Dupont' },
            clientFonction: { type: 'string', example: 'Directeur Technique' },
            clientEmail: { type: 'string', format: 'email', example: 'jean.dupont@velibor.fr' },
            ia_histoire: { type: 'string', description: 'Contexte historique entreprise' },
            ia_probleme: { type: 'string', description: 'Problématique à résoudre' },
            ia_solution: { type: 'string', description: 'Solution envisagée' },
            ia_objectifs: { type: 'string', description: 'Objectifs du projet' }
          }
        },
        
        GenerateInput: {
          allOf: [
            { $ref: '#/components/schemas/ProposalInput' },
            {
              type: 'object',
              properties: {
                contexte: { type: 'string', description: 'Contenu IA pré-généré (post-preview)' },
                demarche: { type: 'string', description: 'Démarche IA pré-générée' },
                phases: { type: 'string', description: 'Phases IA pré-générées' },
                phrase: { type: 'string', description: 'Phrase d\'accroche IA' }
              }
            }
          ]
        },
        
        // === SORTIES ===
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            user: {
              type: 'object',
              properties: {
                username: { type: 'string', example: 'admin' },
                role: { type: 'string', example: 'admin' }
              }
            }
          }
        },
        
        UserResponse: {
          type: 'object',
          properties: {
            authenticated: { type: 'boolean', example: true },
            user: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        },
        
        PreviewResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            aiSections: {
              type: 'object',
              properties: {
                titre: { type: 'string', example: 'Optimisation des flux logistiques' },
                contexte: { type: 'string', example: 'Velibor SA, entreprise leader...' },
                demarche: { type: 'string', example: 'Notre approche se décompose en...' },
                phases: { type: 'string', example: 'Phase 1: Audit...' },
                phrase: { type: 'string', example: 'Ensemble, optimisons votre supply chain.' }
              }
            },
            cost: {
              type: 'object',
              properties: {
                totalUsd: { type: 'number', example: 0.028 },
                inputUsd: { type: 'number', example: 0.012 },
                outputUsd: { type: 'number', example: 0.016 }
              }
            },
            meta: {
              type: 'object',
              properties: {
                model: { type: 'string', example: 'qwen2.5:14b' },
                durationMs: { type: 'integer', example: 4520 }
              }
            }
          }
        },
        
        GenerateResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            documents: {
              type: 'object',
              properties: {
                pdf: {
                  type: 'object',
                  description: 'Document PDF genere',
                  properties: {
                    url: { type: 'string', example: '/files/out/AcmeCorp/2026-01-20/proposal.pdf' },
                    path: { type: 'string', example: '/storage/out/AcmeCorp/2026-01-20/proposal.pdf' }
                  }
                }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                generatedAt: { type: 'string', format: 'date-time', example: '2026-01-20T10:30:00.000Z' },
                entreprise: { type: 'string', example: 'Acme Corp' },
                budget: { type: 'number', example: 20000 },
                budgetFormatted: { type: 'string', example: '20 000 EUR' },
                templateUsed: { type: 'string', example: 'proposal.html' },
                archiveDir: { type: 'string', example: '/storage/out/AcmeCorp/2026-01-20' }
              }
            },
            error: {
              type: 'string',
              nullable: true,
              description: 'Message d\'erreur si success=false'
            }
          }
        },
        
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Description de l\'erreur' },
            code: { type: 'string', example: 'VALIDATION_ERROR' }
          }
        }
      },
      
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'msi.sid',
          description: 'Cookie de session obtenu après login'
        }
      }
    }
  },
  apis: ['./routes/*.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
