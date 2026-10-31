/**
 * InterviewIQ API Service Layer
 * 
 * Separated architecture for future FastAPI backend integration.
 * Currently defaults to Mock Engine with local question synthesis.
 * Clearly labeled mock dataset for demonstration and local development.
 * 
 * Future FastAPI Endpoints expected:
 *   POST /api/v1/generate-questions
 *   POST /api/v1/regenerate-question
 *   GET  /api/v1/health
 */

const DEFAULT_CONFIG = {
  apiBaseUrl: 'http://localhost:8000/api/v1',
  useMockApi: true,
  simulatedDelayMs: 1200,
  defaultDifficulty: 'Senior',
  defaultQuestionCount: 6,
  defaultWeights: {
    technical: 50,
    experience: 35,
    academic: 15,
  },
};

// Retrieve runtime config
export function getApiConfig() {
  try {
    const saved = localStorage.getItem('interviewiq_settings');
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Could not read settings from localStorage, using defaults', e);
  }
  return DEFAULT_CONFIG;
}

export function saveApiConfig(newConfig) {
  try {
    localStorage.setItem('interviewiq_settings', JSON.stringify(newConfig));
  } catch (e) {
    console.error('Failed to save API config', e);
  }
}

/**
 * Local Mock Question Synthesizer
 * Synthesizes mock questions locally with demo rationales and rubrics.
 * Clearly tagged as mock/demo data.
 */
function synthesizeMockQuestions({
  jobTitle = 'Software Engineer',
  jobDescription: _jobDescription,
  candidateProfile: _candidateProfile,
  experienceLevel = 'Senior (6-8 yrs)',
  difficulty = 'Senior',
  questionCount = 6,
  weights = { technical: 50, experience: 35, academic: 15 },
  competencies = [],
}) {
  const batchId = `batch-${Date.now().toString(36)}`;
  const defaultCompetencies = [
    'Technical Skills',
    'Problem Solving',
    'Behavioural Skills',
    'System Design',
  ];

  const targetCompetencies = competencies.length > 0 ? competencies : defaultCompetencies;
  const questions = [];

  // Question templates bank categorized by competency
  const bank = {
    'Technical Skills': [
      {
        q: (title) =>
          `In your primary tech stack for ${title}, how do you manage memory lifecycle, prevent goroutine/thread leaks, and monitor connection pool starvation in long-running services?`,
        why: (title, exp, w) =>
          `[Demo Rationale] Evaluates concrete language runtime depth for ${title} at ${exp} level based on Technical Skills weight of ${w.technical}%.`,
        rubric:
          'Evaluates: Deep understanding of runtime internals (event loop / memory allocation / connection pool checkout), heap dumps, and connection timeouts.',
        followUps: [
          'What tools do you use to capture production heap dumps with minimal performance overhead?',
          'How do you tune TCP keepalive and connection reuse across microservices?',
        ],
      },
      {
        q: (title) =>
          `How would you design a strongly-typed schema validation and serialization layer for ${title} that guards against malformed payloads and injection before hitting business logic?`,
        why: (title, exp, w) =>
          `[Demo Rationale] Measures defensive API contract hygiene and strong type-safety discipline (Weighted: ${w.technical}%).`,
        rubric:
          'Evaluates: Runtime validation schemas (Zod / Pydantic), type inference, rate limiting, and parameter sanitization.',
        followUps: [
          'How do you manage backward compatibility when deprecating required contract fields?',
        ],
      },
      {
        q: (title) =>
          `Explain how you handle concurrency, optimistic vs. pessimistic locking, and race conditions during high-volume transactional mutations in ${title}.`,
        why: (title, exp, w) =>
          `[Demo Rationale] Assesses technical rigor in handling concurrent state changes safely under load (Technical Weight: ${w.technical}%).`,
        rubric:
          'Evaluates: Isolation levels (SERIALIZABLE vs REPEATABLE READ), atomic CAS operations, distributed redis locks, or event queues.',
        followUps: [
          'When would you deliberately choose optimistic concurrency over database record locks?',
        ],
      },
    ],
    'Problem Solving': [
      {
        q: () =>
          `Users report that search and analytics endpoints are experiencing intermittent 3-second latency spikes during peak traffic hours. Walk through your systematic root-cause investigation steps.`,
        why: (title, exp, w) =>
          `[Demo Rationale] Tests hypothesis-driven debugging and performance triage at ${exp} level (Technical: ${w.technical}%, Experience: ${w.experience}%).`,
        rubric:
          'Evaluates: Structured diagnostic methodology, distributed tracing (OpenTelemetry), query explain plans (seq scans vs index scans), and database lock contention checks.',
        followUps: [
          'If application metrics show normal CPU/RAM, what operating system or network metrics would you inspect next?',
        ],
      },
      {
        q: () =>
          `Suppose you need to compute 24-hour rolling unique visitor metrics across 50 million daily records with strict memory constraints. What algorithmic data structures would you consider?`,
        why: (title, exp, w) =>
          `[Demo Rationale] Evaluates algorithmic problem solving and memory trade-offs (Academic: ${w.academic}%, Technical: ${w.technical}%).`,
        rubric:
          'Evaluates: HyperLogLog probabilistic cardinality counting, Redis bitmaps, sliding window time-buckets, and error tolerance understanding.',
        followUps: [
          'How would you explain the 1-2% probabilistic error margin of HyperLogLog to non-technical stakeholders?',
        ],
      },
    ],
    'Behavioural Skills': [
      {
        q: () =>
          `Tell me about a time when business priorities demanded a rapid delivery deadline that conflicted with your architectural standards or technical debt threshold. How did you negotiate?`,
        why: (title, exp, w) =>
          `[Demo Rationale] Measures pragmatic engineering leadership and cross-functional communication based on Relevant Experience weight of ${w.experience}%.`,
        rubric:
          'Evaluates: Articulating business risk of tech debt, proposing phased rollout or MVP compromises, and documenting future remediation objectively.',
        followUps: [
          'Did that technical debt ever get repaid? What was your plan to ensure it was prioritized on the product roadmap?',
        ],
      },
      {
        q: () =>
          `Describe a situation where a critical regression made it past code review and automated CI into production. How did you lead the post-mortem without assigning blame?`,
        why: (title, exp, w) =>
          `[Demo Rationale] Assesses blameless post-mortem culture and systemic prevention mindset (Experience: ${w.experience}%).`,
        rubric:
          'Evaluates: Focus on process/tooling failure rather than human error, actionable preventive measures (guardrails, synthetic monitors, canary deployments).',
        followUps: [
          'How do you balance adding guardrails with keeping engineering velocity fast?',
        ],
      },
    ],
    'System Design': [
      {
        q: (title) =>
          `How would you architect a fault-tolerant, horizontally scalable service for ${title} handling unexpected 10x traffic spikes while maintaining sub-100ms p99 latency?`,
        why: (title, exp, w) =>
          `[Demo Rationale] Validates high-scale architectural design depth at ${exp} level (Technical: ${w.technical}%, Experience: ${w.experience}%).`,
        rubric:
          'Evaluates: Caching layers (Redis), backpressure/load-shedding, asynchronous message queues, database indexing and read replicas, and circuit-breaker patterns.',
        followUps: [
          'What telemetry metrics would trigger an automated fallback degradation?',
          'How do you prevent cache stampedes during sudden traffic bursts?',
        ],
      },
      {
        q: () =>
          `Design an idempotent event consumer pipeline handling 50M events per day with Kafka and PostgreSQL, guaranteeing exactly-once semantics during network partitions.`,
        why: (title, exp, w) =>
          `[Demo Rationale] Validates distributed systems architecture, state consensus, and deduplication keys (Experience: ${w.experience}%).`,
        rubric:
          'Evaluates: Transactional outbox pattern, deduplication key storage, idempotent consumer design, and dead-letter queues.',
        followUps: [
          'What happens if the deduplication cache in Redis fails or evicts keys under memory pressure?',
        ],
      },
    ],
  };

  let count = 0;
  let compIndex = 0;

  while (count < questionCount) {
    const comp = targetCompetencies[compIndex % targetCompetencies.length];
    const compPool = bank[comp] || bank['Technical Skills'];
    const template = compPool[count % compPool.length];

    const questionText = template.q(jobTitle);
    const whyText = template.why(jobTitle, experienceLevel, weights);
    const rubricText = template.rubric;
    const followUps = template.followUps;

    questions.push({
      id: `iq-${Date.now().toString(36)}-${count + 1}`,
      batchId,
      jobTitle,
      competency: comp,
      difficulty,
      experienceLevel,
      question: questionText,
      whyRelevant: whyText,
      evaluationRubric: rubricText,
      followUps,
      status: 'pending',
      createdAt: new Date(Date.now() + count * 1000).toISOString(),
      interviewerNotes: '',
    });

    count++;
    compIndex++;
  }

  return questions;
}

/**
 * Generate Questions API
 * Coordinates with mock engine or future FastAPI endpoint
 */
export async function generateQuestions(payload, { onProgress } = {}) {
  const config = getApiConfig();

  // If connected to future FastAPI backend
  if (!config.useMockApi) {
    if (onProgress) onProgress({ step: 1, message: 'Connecting to FastAPI backend...' });
    try {
      const response = await fetch(`${config.apiBaseUrl}/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        isMock: false,
        questions: data.questions || data,
        batchId: data.batchId || `batch-${Date.now().toString(36)}`,
      };
    } catch (err) {
      console.warn('FastAPI backend request failed:', err);
      throw new Error(`FastAPI backend unreachable at ${config.apiBaseUrl}. Please verify server status in Settings.`);
    }
  }

  // --- LOCAL MOCK ENGINE SIMULATION ---
  const delay = config.simulatedDelayMs || 1200;
  const stepDelay = Math.max(200, Math.floor(delay / 4));

  if (onProgress) onProgress({ step: 1, message: 'Parsing role requirements & seniority...' });
  await new Promise((r) => setTimeout(r, stepDelay));

  if (onProgress) onProgress({ step: 2, message: 'Balancing evaluation weights (Tech, Exp, Acad)...' });
  await new Promise((r) => setTimeout(r, stepDelay));

  if (onProgress) onProgress({ step: 3, message: 'Synthesizing competency-targeted demo questions...' });
  await new Promise((r) => setTimeout(r, stepDelay));

  if (onProgress) onProgress({ step: 4, message: 'Formulating evaluation rubrics and rationales...' });
  await new Promise((r) => setTimeout(r, stepDelay));

  const questions = synthesizeMockQuestions(payload);

  return {
    success: true,
    isMock: true,
    questions,
    batchId: questions[0]?.batchId || `batch-${Date.now().toString(36)}`,
  };
}

/**
 * Regenerate a single question with alternative mock prompt
 */
export async function regenerateQuestion(question, context = {}) {
  const config = getApiConfig();

  if (!config.useMockApi) {
    try {
      const response = await fetch(`${config.apiBaseUrl}/regenerate-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, competency: question.competency, context }),
      });
      if (!response.ok) throw new Error('Failed to regenerate via FastAPI backend');
      const data = await response.json();
      return { success: true, question: data };
    } catch (err) {
      throw new Error(`Failed to regenerate via backend: ${err.message}`);
    }
  }

  // Mock regeneration simulation
  await new Promise((r) => setTimeout(r, 600));

  const skillName = question.skillName || question.competency || 'Core Engineering';
  const diff = question.difficulty || 'Medium';
  const score = question.candidateScore || 85;
  const weight = question.skillWeight || 25;
  const hintText = context?.hint?.trim();

  let pool = [];
  if (diff === 'Hard') {
    pool = [
      {
        question: hintText
          ? `Addressing hint "${hintText}": In high-scale ${skillName} architecture, describe how you mitigate cascading failure cascades and maintain sub-second p99 latency SLAs under sudden 10x traffic spikes.`
          : `Deep architectural evaluation in ${skillName}: Walk me through a complex production outage or deadlock you investigated under high load. What kernel, heap, or network metrics pinpointed the root cause?`,
        whyRelevant: `⚡ [Regenerated Hard] Calibrated for high candidate match (${score}%) and ${skillName} (${weight}% weight)${hintText ? ` with hint: "${hintText}"` : ''}. Evaluates staff-level failure handling.`,
        rubric: `Interviewer evaluates: Concrete isolation boundaries, circuit breakers, idempotency, horizontal scalability, and p99 latency considerations.`,
        followUps: [
          'What automated chaos or stress tests in CI validate this recovery mechanism?',
          'What specific distributed telemetry traces alert your team before users notice degraded response times?',
        ],
      },
      {
        question: hintText
          ? `Targeting "${hintText}": When engineering mission-critical ${skillName} systems, how do you resolve severe thread or database connection pool exhaustion without dropping transaction records?`
          : `When designing distributed infrastructure for ${skillName}, how do you evaluate the trade-offs between eventual consistency and strict linearizability under network partitioning?`,
        whyRelevant: `⚡ [Regenerated Hard] Assesses advanced distributed system consistency and operational resilience in ${skillName}.`,
        rubric: `Interviewer listens for: CAP theorem trade-offs, consensus algorithms, partition tolerance, and reconciliation mechanisms.`,
        followUps: [
          'How does your design prevent duplicate write operations during failover transitions?',
          'How do you measure lag across replicas in staging benchmarks?',
        ],
      },
      {
        question: hintText
          ? `Focusing on "${hintText}": In high-volume ${skillName} deployments, how do you govern non-backward-compatible API contract migrations across independent service teams?`
          : `In high-volume ${skillName} deployments, how do you lead engineering teams through contentious architectural migrations without incurring regression downtime or customer disruption?`,
        whyRelevant: `⚡ [Regenerated Hard] Evaluates engineering leadership, RFC consensus-building, and organizational technical governance.`,
        rubric: `Interviewer looks for: Phased dual-write transitions, automated regression validation, and clear risk articulation to stakeholders.`,
        followUps: [
          'How did you ensure deprecated endpoints were safely retired without silent failures?',
          'What quantitative metric proved the architectural migration was successful?',
        ],
      },
    ];
  } else if (diff === 'Easy') {
    pool = [
      {
        question: hintText
          ? `Focusing on "${hintText}": To verify foundational competency in ${skillName}, what are the essential syntax patterns, lifecycle rules, and common mistakes new developers should avoid?`
          : `To establish foundational mastery in ${skillName}, walk me through the standard data flow, component lifecycle, and common anti-patterns you watch out for.`,
        whyRelevant: `⚡ [Regenerated Easy] Calibrated to verify core fundamentals in ${skillName} (${weight}% weight)${hintText ? ` with hint: "${hintText}"` : ''}.`,
        rubric: `Interviewer looks for: Conceptual accuracy, awareness of core principles, and clean error handling.`,
        followUps: [
          'What is the most frequent mistake when implementing this and how do you prevent it?',
          'Which basic unit test cases would you write first?',
        ],
      },
      {
        question: hintText
          ? `Targeting "${hintText}": Walk me through the step-by-step workflow you follow when creating a basic module in ${skillName} from scratch.`
          : `Walk me through your daily workflow when creating a new component or function in ${skillName}. How do you validate inputs and ensure readable code?`,
        whyRelevant: `⚡ [Regenerated Easy] Evaluates consistent software hygiene and standard execution in ${skillName}.`,
        rubric: `Interviewer evaluates: Clean code structure, basic input validation, and readable naming conventions.`,
        followUps: [
          'What happens if invalid or null parameters are passed to your module?',
          'What unit testing framework do you prefer for testing this component?',
        ],
      },
    ];
  } else {
    // Medium
    pool = [
      {
        question: hintText
          ? `Targeting "${hintText}": Based on your experience with ${skillName}, describe how you diagnose and fix a tricky latency bottleneck or memory regression in production.`
          : `Describe a tricky real-world bug or performance bottleneck you resolved in ${skillName}. Walk me through your hypothesis testing and how you verified the fix.`,
        whyRelevant: `⚡ [Regenerated Medium] Evaluates diagnostic methodology and practical problem-solving in ${skillName}${hintText ? ` with hint: "${hintText}"` : ''}.`,
        rubric: `Interviewer evaluates: Systematic diagnosis (profiling, logs, reproducing test cases) over random guesswork.`,
        followUps: [
          'What automated test did you add to ensure this issue does not regress?',
          'What profiling or telemetry tool proved the fix worked?',
        ],
      },
      {
        question: hintText
          ? `Focusing on "${hintText}": When building features in ${skillName}, how do you structure components for long-term maintainability and automated testability?`
          : `When building features in ${skillName}, how do you structure modules to balance rapid product delivery against clean architecture and maintainability?`,
        whyRelevant: `⚡ [Regenerated Medium] Measures balanced engineering judgment and modular code architecture in ${skillName}.`,
        rubric: `Interviewer looks for: Clean modular boundaries, test isolation, and pragmatic trade-off management.`,
        followUps: [
          'How do you mock or stub external dependencies when testing this feature?',
          'What code review standard do you enforce across your team?',
        ],
      },
      {
        question: hintText
          ? `Addressing "${hintText}": Walk me through how you implement integration contracts and schema validation when ${skillName} communicates with downstream APIs.`
          : `Walk me through how you establish automated integration tests and schema validation when integrating ${skillName} with other microservices or external APIs.`,
        whyRelevant: `⚡ [Regenerated Medium] Tests integration rigor, boundary validation, and API contract resilience in ${skillName}.`,
        rubric: `Interviewer listens for: Contract testing, deterministic mocks, error parsing, and defensive programming.`,
        followUps: [
          'How do you handle API breaking changes from upstream providers?',
          'What timeout and retry backoff policies do you implement?',
        ],
      },
    ];
  }

  const selectedAlt = pool[Math.floor(Math.random() * pool.length)];

  const updatedQuestion = {
    ...question,
    question: selectedAlt.question,
    whyRelevant: selectedAlt.whyRelevant,
    evaluationRubric: selectedAlt.rubric,
    followUps: selectedAlt.followUps || question.followUps || [],
    status: 'pending',
    rejectionReason: null,
    interviewerHint: hintText || null,
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    isMock: true,
    question: updatedQuestion,
  };
}

/**
 * Backend Analysis A: Perform Unified Candidate & Job Analysis
 * Calls FastAPI POST /api/analysis/candidate
 */
export async function analyzeCandidateBackend({ role_title, job_description, resume_text, resume_pdf_path }) {
  const config = getApiConfig();
  const baseUrl = (config.apiBaseUrl || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');

  const response = await fetch(`${baseUrl}/api/analysis/candidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ role_title, job_description, resume_text, resume_pdf_path }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Candidate analysis failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Backend Analysis A: Update Job Skill Weights
 * Calls FastAPI PATCH /api/jobs/{job_id}/skills
 */
export async function updateJobSkillsBackend(jobId, skillsList) {
  const config = getApiConfig();
  const baseUrl = (config.apiBaseUrl || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');

  const response = await fetch(`${baseUrl}/api/jobs/${jobId}/skills`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ skills: skillsList }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Skill update failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Stage 2: Extract Skills, Evaluate Evidence & Fit Summary
 */
export async function extractSkillsAndProfile({
  jobTitle = 'Software Engineer',
  jobDescription = '',
  candidateProfile = '',
  resumeFileName = null,
  duration = 45,
  difficulty = 'Auto',
}, { onProgress } = {}) {
  const config = getApiConfig();

  // Try connecting to Analysis A backend API first!
  try {
    if (onProgress) onProgress({ step: 1, message: 'Connecting to Analysis A backend (FastAPI)...' });

    const backendResult = await analyzeCandidateBackend({
      role_title: jobTitle,
      job_description: jobDescription,
      resume_text: candidateProfile || 'Candidate experience in software engineering.',
    });

    if (backendResult?.success && backendResult?.data) {
      const { candidate_profile, job_analysis, comparison } = backendResult.data;

      const weightedSkills = job_analysis?.weighted_skills || [];
      const skills = weightedSkills.map((sk, idx) => {
        const evMatch = candidate_profile?.skill_evidence?.find(
          (e) => e.skill.toLowerCase() === sk.name.toLowerCase()
        );
        return {
          id: `sk-${idx + 1}`,
          name: sk.name,
          category: sk.competency || 'Technical Skills',
          status: sk.weight >= 0.8 ? 'required' : 'preferred',
          weight: sk.weight,
          normalized_weight: sk.normalized_weight,
          evidence: evMatch
            ? `Evidence (${evMatch.confidence} confidence): ${evMatch.evidence}`
            : `Extracted requirement for ${sk.competency || 'Role'}.`,
        };
      });

      const candidateSummary = {
        candidateName: resumeFileName ? resumeFileName.replace(/\.[^/.]+$/, '') : 'Candidate',
        score: comparison?.overall_score != null ? Math.round(comparison.overall_score) : 88,
        band: comparison?.candidate_band ? comparison.candidate_band.replace(/_/g, ' ').toUpperCase() : 'PROVISIONAL MATCH',
        strengths: comparison?.strengths || [],
        gaps: (comparison?.skill_gaps || []).map((g) => `${g.name} (${g.competency})`),
        lowInfo: job_analysis?.low_info || false,
        comparison: comparison,
        candidate_profile: candidate_profile,
        job_analysis: job_analysis,
      };

      if (onProgress) onProgress({ step: 3, message: 'Analysis A complete! Syncing candidate profile...' });

      return {
        success: true,
        isMock: false,
        skills,
        candidateSummary,
        comparison,
        jobAnalysis: job_analysis,
        candidateProfile: candidate_profile,
        defaultWeights: {
          technical: 50,
          experience: 35,
          academic: 15,
        },
      };
    }
  } catch (backendErr) {
    console.warn('Backend Analysis A endpoint unreachable, using local processing:', backendErr.message);
  }

  if (onProgress) onProgress({ step: 1, message: 'Analyzing job description requirements...' });
  await new Promise((r) => setTimeout(r, 300));

  if (onProgress) onProgress({ step: 2, message: 'Parsing candidate resume & profile...' });
  await new Promise((r) => setTimeout(r, 350));

  if (onProgress) onProgress({ step: 3, message: 'Extracting competency evidence and candidate alignment...' });
  await new Promise((r) => setTimeout(r, 300));

  const textLower = `${jobTitle} ${jobDescription} ${candidateProfile}`.toLowerCase();
  const isLowInfo = jobDescription.trim().length < 120;

  // Derive candidate name
  const nameMatch = candidateProfile.match(/Candidate:\s*([^\n\r,]+)/i);
  const candidateName = nameMatch ? nameMatch[1].trim() : resumeFileName ? resumeFileName.replace(/\.[^/.]+$/, '') : 'Candidate';


  // Domain skills synthesis
  let skills = [];
  if (textLower.includes('react') || textLower.includes('frontend') || textLower.includes('typescript') || textLower.includes('ui') || textLower.includes('css')) {
    skills = [
      {
        id: 'sk-1',
        name: 'React 19 & State Architecture',
        category: 'Technical Skills',
        status: 'required',
        weight: 35,
        evidence: 'Job requires architecting scalable design systems; candidate has 6 yrs modular micro-frontend experience.',
      },
      {
        id: 'sk-2',
        name: 'Strict TypeScript & Generic Types',
        category: 'Technical Skills',
        status: 'required',
        weight: 25,
        evidence: 'Role emphasizes strict typing standards; candidate profile lists daily TypeScript & Next.js usage.',
      },
      {
        id: 'sk-3',
        name: 'Real-time WebSockets & Telemetry',
        category: 'Problem Solving',
        status: 'required',
        weight: 15,
        evidence: 'Job posting mentions low-latency streaming telemetry; candidate built WebSocket data feeds.',
      },
      {
        id: 'sk-4',
        name: 'Core Web Vitals & Caching Strategy',
        category: 'Problem Solving',
        status: 'preferred',
        weight: 10,
        evidence: 'Requirements state client caching optimization (React Query / TanStack); profile notes 42% bundle reduction.',
      },
      {
        id: 'sk-5',
        name: 'Micro-Frontend Modular Scalability',
        category: 'System Design',
        status: 'required',
        weight: 10,
        evidence: 'Enterprise SaaS scale requirements; candidate led migration from monolithic Redux to micro-frontends.',
      },
      {
        id: 'sk-6',
        name: 'Engineering Mentorship & Cross-Team RFCs',
        category: 'Behavioural Skills',
        status: 'preferred',
        weight: 5,
        evidence: 'Required to mentor junior engineers; candidate background notes team leadership in high-growth startups.',
      },
    ];
  } else if (textLower.includes('python') || textLower.includes('go') || textLower.includes('backend') || textLower.includes('kafka') || textLower.includes('distributed')) {
    skills = [
      {
        id: 'sk-1',
        name: 'Distributed Concurrency & Async Runtimes',
        category: 'Technical Skills',
        status: 'required',
        weight: 30,
        evidence: 'Job specifies AsyncIO/Go concurrency; candidate built $10M/day payment worker.',
      },
      {
        id: 'sk-2',
        name: 'Kafka Partitioning & Idempotent Processing',
        category: 'System Design',
        status: 'required',
        weight: 25,
        evidence: 'High throughput event pipelines (200M+ events/day); candidate lists Kafka & Redis Cluster.',
      },
      {
        id: 'sk-3',
        name: 'High-Volume Production Incident Triage',
        category: 'Problem Solving',
        status: 'required',
        weight: 20,
        evidence: 'Zero-downtime SLA requirements; candidate maintained 99.999% uptime in fintech.',
      },
      {
        id: 'sk-4',
        name: 'PostgreSQL Locking & Schema Evolution',
        category: 'Technical Skills',
        status: 'preferred',
        weight: 15,
        evidence: 'Zero-downtime database migrations required; candidate profile lists relational schema optimization.',
      },
      {
        id: 'sk-5',
        name: 'Technical Leadership & Blameless Post-Mortems',
        category: 'Behavioural Skills',
        status: 'required',
        weight: 10,
        evidence: 'Authoring RFC specs and cross-team alignment; candidate has 9 years engineering experience.',
      },
    ];
  } else if (textLower.includes('ml') || textLower.includes('ai') || textLower.includes('llm') || textLower.includes('pytorch')) {
    skills = [
      {
        id: 'sk-1',
        name: 'LLM Serving & Low-Latency Inference',
        category: 'Technical Skills',
        status: 'required',
        weight: 35,
        evidence: 'Serving with Triton/vLLM/FastAPI; candidate deployed semantic caching assistants.',
      },
      {
        id: 'sk-2',
        name: 'Vector Indexing & Semantic Search (Qdrant)',
        category: 'Technical Skills',
        status: 'required',
        weight: 25,
        evidence: 'Vector search & RAG pipelines in job requirements; candidate lists Qdrant and LangChain.',
      },
      {
        id: 'sk-3',
        name: 'Hallucination Mitigation & Evaluation Benchmarks',
        category: 'Problem Solving',
        status: 'required',
        weight: 20,
        evidence: 'Evaluation frameworks for hallucinations & token costs required in posting.',
      },
      {
        id: 'sk-4',
        name: 'Stakeholder Expectation Management for AI',
        category: 'Behavioural Skills',
        status: 'preferred',
        weight: 20,
        evidence: 'Translating probabilistic model bounds to product teams; candidate supported 1,500 employees.',
      },
    ];
  } else {
    // General engineering defaults
    skills = [
      {
        id: 'sk-1',
        name: 'Core Language Fundamentals & System Design',
        category: 'Technical Skills',
        status: 'required',
        weight: 40,
        evidence: 'Core technical requirements from role description.',
      },
      {
        id: 'sk-2',
        name: 'Production Debugging & Root Cause Analysis',
        category: 'Problem Solving',
        status: 'required',
        weight: 30,
        evidence: 'Hypothesis testing and production issue resolution.',
      },
      {
        id: 'sk-3',
        name: 'Team Collaboration & Technical Communication',
        category: 'Behavioural Skills',
        status: 'required',
        weight: 20,
        evidence: 'Cross-functional engineering communication and planning.',
      },
      {
        id: 'sk-4',
        name: 'Architectural Scaling & Maintainability',
        category: 'System Design',
        status: 'preferred',
        weight: 10,
        evidence: 'Long-term maintainability and system modularity.',
      },
    ];
  }

  // Calculate candidate fit score
  const score = Math.min(95, Math.max(76, Math.floor(82 + (candidateProfile.length % 14))));

  const candidateSummary = {
    candidateName,
    score,
    band: difficulty === 'Auto' ? 'Senior Specialist (L5)' : `${difficulty} Alignment`,
    strengths: [
      `Direct hands-on experience in ${skills[0].name} and production architecture`,
      'Demonstrated ownership of high-impact engineering milestones',
      'Solid alignment between prior project scope and team technical requirements',
    ],
    gaps: [
      'Limited formal documentation of multi-region disaster recovery in profile',
      ...(isLowInfo ? ['Job description lacks explicit performance thresholds or tooling constraints'] : []),
    ],
    lowInfo: isLowInfo,
  };

  return {
    success: true,
    isMock: true,
    skills,
    candidateSummary,
    defaultWeights: {
      technical: 50,
      experience: 35,
      academic: 15,
    },
  };
}

/**
 * Stage 3: Generate Interview Plan from Calibrated Skills & Weights
 */
export async function generateInterviewPlanFromSkills({
  jobTitle,
  candidateProfile,
  skills,
  weights = { technical: 50, experience: 35, academic: 15 },
  duration = 45,
  difficulty = 'Auto',
  candidateScore = null,
  candidateSummary = null,
}, { onProgress } = {}) {
  const isAutoDifficulty =
    !difficulty ||
    difficulty === 'Auto' ||
    difficulty.toLowerCase().includes('auto') ||
    difficulty.toLowerCase().includes('automatically');

  // Candidate match score (scale 0 - 100)
  const effectiveScore = typeof candidateScore === 'number'
    ? candidateScore
    : (candidateSummary?.score != null ? Number(candidateSummary.score) : 85);

  if (onProgress) onProgress({ step: 1, message: 'Mapping calibrated skills & candidate competencies...' });
  await new Promise((r) => setTimeout(r, 320));

  if (onProgress) {
    onProgress({
      step: 2,
      message: isAutoDifficulty
        ? `Automatically calibrating difficulty based on candidate score (${effectiveScore}%) & skill weights...`
        : `Calibrating ${difficulty} questions to evaluation rubrics...`,
    });
  }
  await new Promise((r) => setTimeout(r, 350));

  if (onProgress) onProgress({ step: 3, message: 'Synthesizing competency questions and evaluation rubrics...' });
  await new Promise((r) => setTimeout(r, 380));

  // Determine target question count based on duration
  const targetCount = duration === 30 ? 4 : duration === 60 ? 8 : 6;
  const batchId = `plan-${Date.now().toString(36)}`;
  const questions = [];

  for (let i = 0; i < targetCount; i++) {
    const skill = skills[i % skills.length];

    // Normalize skill weight to percentage (0 - 100)
    const rawWeight = typeof skill.weight === 'number' ? skill.weight : 25;
    const skillWeight = rawWeight > 1 ? Math.round(rawWeight) : Math.round(rawWeight * 100);

    // Relative rank in prioritized list: earlier skills have higher priority
    const priorityFactor = i < skills.length ? ((skills.length - i) / skills.length) : 0.5;

    // Automatic difficulty calculation:
    // Blends candidate match score (60%), skill importance weight (30%), and priority rank (10%)
    let questionDifficulty = 'Medium';
    if (isAutoDifficulty) {
      const calibrationScore = Math.round(
        (effectiveScore * 0.60) +
        (Math.min(100, skillWeight * 2.2) * 0.30) +
        (priorityFactor * 100 * 0.10)
      );

      if (calibrationScore >= 74) {
        questionDifficulty = 'Hard';
      } else if (calibrationScore >= 50) {
        questionDifficulty = 'Medium';
      } else {
        questionDifficulty = 'Easy';
      }
    } else {
      questionDifficulty = difficulty;
    }

    // Formulate difficulty-calibrated question templates, rubrics, and follow-ups
    let template;

    if (questionDifficulty === 'Hard') {
      const hardTemplates = [
        {
          q: `Given your strong candidate match score (${effectiveScore}%) and the critical priority of ${skill.name} (${skillWeight}% weight), how would you architect an enterprise-grade solution that handles severe traffic spikes while maintaining strict sub-100ms latency SLAs and complete fault isolation?`,
          why: isAutoDifficulty
            ? `⚡ Automatically assigned [Hard] based on Candidate Score (${effectiveScore}%) & ${skill.name} Priority Weight (${skillWeight}%). Rigorously evaluates production resilience and staff-level depth.`
            : `[Hard] Evaluates enterprise architecture and high-scale fault tolerance in ${skill.name} (${skillWeight}% weight).`,
          rubric: `Interviewer looks for: Concrete partitioning/caching trade-offs, circuit breakers, idempotency, horizontal scalability, and p99 latency considerations.`,
          followUps: [
            'What specific telemetry signals or distributed trace spans would you monitor to detect degraded dependencies under load?',
            'How do you validate failure recovery through chaos testing in staging before deploying to production?',
          ],
        },
        {
          q: `Describe a critical production outage, race condition, or memory leak you diagnosed in ${skill.name}. Walk me through your hypothesis testing under pressure and how you proved the root cause without impacting live users.`,
          why: isAutoDifficulty
            ? `⚡ Automatically assigned [Hard] based on Candidate Score (${effectiveScore}%) & ${skill.name} Priority Weight (${skillWeight}%). Evaluates deep diagnostic rigor and systemic prevention under high production stakes.`
            : `[Hard] Assesses deep diagnostic triage and systemic prevention in ${skill.name} (${skillWeight}% weight).`,
          rubric: `Interviewer evaluates: Structured profiling (heap dumps, lock contention, flame graphs) over guesswork, and permanent guardrails preventing recurrence.`,
          followUps: [
            'If standard APM metrics show healthy CPU/RAM, what deeper OS or runtime metrics would you inspect?',
            'What automated canary or regression gate did you add to CI/CD to prevent recurrence?',
          ],
        },
        {
          q: `In high-scale ${skill.name} systems, how do you lead engineering teams through contentious architectural decisions (e.g., breaking API contracts vs. backward compatibility), and how do you quantify technical debt risk to executive stakeholders?`,
          why: isAutoDifficulty
            ? `⚡ Automatically assigned [Hard] based on Candidate Score (${effectiveScore}%) & ${skill.name} Priority Weight (${skillWeight}%). Assesses senior/staff engineering leadership and long-term maintainability.`
            : `[Hard] Measures senior technical governance and architectural debt communication in ${skill.name}.`,
          rubric: `Interviewer listens for: Clear business articulation of technical risk, phased delivery proposals, and proactive debt documentation.`,
          followUps: [
            'How did you ensure deprecated pathways were cleanly retired without breaking external integrations?',
            'How did you quantify the engineering velocity impact of the architectural migration?',
          ],
        },
      ];
      template = hardTemplates[i % hardTemplates.length];
    } else if (questionDifficulty === 'Medium') {
      const mediumTemplates = [
        {
          q: `Based on your candidate alignment in ${skill.name} (${skillWeight}% weight), walk through how you structure and modularize a feature in ${skill.name} for maintainability, testability, and clean separation of concerns.`,
          why: isAutoDifficulty
            ? `⚡ Automatically assigned [Medium] based on Candidate Score (${effectiveScore}%) & ${skill.name} Priority Weight (${skillWeight}%). Assesses clean code design, modularity, and adherence to industry best practices.`
            : `[Medium] Assesses clean modularity and standard engineering practices in ${skill.name} (${skillWeight}% weight).`,
          rubric: `Interviewer looks for: Clean component/module boundaries, deterministic state management, dependency injection, and automated unit/integration test coverage.`,
          followUps: [
            'How do you structure mocks and integration test harnesses for this component?',
            'What automated linting or static analysis rules protect this standard across the team?',
          ],
        },
        {
          q: `Walk through a real-world debugging challenge or performance bottleneck you resolved in ${skill.name}. What debugging tools did you utilize and how did you verify the fix resolved the problem?`,
          why: isAutoDifficulty
            ? `⚡ Automatically assigned [Medium] based on Candidate Score (${effectiveScore}%) & ${skill.name} Priority Weight (${skillWeight}%). Tests practical problem-solving methodology and debugging rigor.`
            : `[Medium] Tests practical problem-solving methodology and debugging rigor in ${skill.name} (${skillWeight}% weight).`,
          rubric: `Interviewer evaluates: Systematic diagnosis (logs, network inspectors, unit repros) and verification through automated test assertion.`,
          followUps: [
            'How did you ensure other parts of the application were not broken by this change?',
            'What would you do differently if faced with this issue again under tighter constraints?',
          ],
        },
        {
          q: `When delivering under tight product deadlines in ${skill.name}, how do you decide when to take on pragmatic technical debt versus pushing back on timelines to refactor?`,
          why: isAutoDifficulty
            ? `⚡ Automatically assigned [Medium] based on Candidate Score (${effectiveScore}%) & ${skill.name} Priority Weight (${skillWeight}%). Measures balanced engineering judgment and communication around technical trade-offs.`
            : `[Medium] Measures balanced engineering judgment and communication around technical trade-offs in ${skill.name}.`,
          rubric: `Interviewer listens for: Documented debt tickets, risk containment, and collaborative alignment with product managers.`,
          followUps: [
            'How did you ensure the tech debt was prioritized in subsequent sprints?',
            'What guardrails prevented the short-term compromise from cascading into other features?',
          ],
        },
      ];
      template = mediumTemplates[i % mediumTemplates.length];
    } else {
      // Easy questions
      const easyTemplates = [
        {
          q: `To verify foundational proficiency in ${skill.name} (calibrated for core baseline validation), explain the essential concepts, standard execution lifecycle, and common anti-patterns that developers often encounter.`,
          why: isAutoDifficulty
            ? `⚡ Automatically assigned [Easy] based on Candidate Score (${effectiveScore}%) & ${skill.name} Priority Weight (${skillWeight}%). Validates foundational fundamentals and conceptual clarity before moving to complex topics.`
            : `[Easy] Validates foundational concepts, standard execution flow, and baseline knowledge in ${skill.name} (${skillWeight}% weight).`,
          rubric: `Interviewer looks for: Accurate conceptual explanations, standard syntax and lifecycle awareness, and clean error handling.`,
          followUps: [
            'What is the most frequent beginner mistake in this area and how do you avoid it?',
            'Which core unit test scenarios would you write first for this component?',
          ],
        },
        {
          q: `Walk me through the standard workflow you follow when creating a new component or function using ${skill.name}. How do you ensure input validation and appropriate error feedback?`,
          why: isAutoDifficulty
            ? `⚡ Automatically assigned [Easy] based on Candidate Score (${effectiveScore}%) & ${skill.name} Priority Weight (${skillWeight}%). Evaluates consistent software hygiene and standard day-to-day execution.`
            : `[Easy] Evaluates day-to-day software hygiene, input validation, and basic test coverage in ${skill.name}.`,
          rubric: `Interviewer evaluates: Clean code structure, sensible error handling, and basic automated testing habits.`,
          followUps: [
            'What happens if null or invalid parameters are passed into your module?',
            'Which testing framework or assertion library do you prefer for validating this behavior?',
          ],
        },
        {
          q: `In ${skill.name}, what naming conventions, project folder structure, and documentation practices do you follow to make your code immediately readable by team members?`,
          why: isAutoDifficulty
            ? `⚡ Automatically assigned [Easy] based on Candidate Score (${effectiveScore}%) & ${skill.name} Priority Weight (${skillWeight}%). Assesses team collaboration habits and baseline engineering hygiene.`
            : `[Easy] Assesses team collaboration conventions and codebase readability in ${skill.name}.`,
          rubric: `Interviewer listens for: Consistent convention adherence, readable self-documenting code, and clean pull request practices.`,
          followUps: [
            'How do you approach code reviews when onboarding new team members?',
            'What documentation do you provide for shared utilities or helper functions?',
          ],
        },
      ];
      template = easyTemplates[i % easyTemplates.length];
    }

    questions.push({
      id: `plan-q-${Date.now().toString(36)}-${i + 1}`,
      batchId,
      jobTitle,
      skillId: skill.id,
      skillName: skill.name,
      competency: skill.category,
      difficulty: questionDifficulty,
      autoAssigned: isAutoDifficulty,
      candidateScore: effectiveScore,
      skillWeight,
      question: template.q,
      whyRelevant: template.why,
      evaluationRubric: template.rubric,
      followUps: template.followUps,
      status: 'pending',
      createdAt: new Date().toISOString(),
      interviewerNotes: '',
    });
  }

  return {
    success: true,
    isMock: true,
    batchId,
    questions,
  };
}

/**
 * Test FastAPI Backend Health
 */
export async function testBackendConnection(baseUrl) {
  try {
    const url = baseUrl.replace(/\/+$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: true, message: 'Connected to FastAPI backend service', data };
    }
    return { success: false, message: `Server replied with HTTP status ${response.status}` };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, message: 'Connection timed out after 3.5s' };
    }
    return { success: false, message: `Backend offline: ${err.message}` };
  }
}
