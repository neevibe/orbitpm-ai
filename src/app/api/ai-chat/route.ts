import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ProjectStats {
  totalProjects: number;
  completed: number;
  delayed: number;
  inProgress: number;
  notStarted: number;
  openRisks: number;
  stuckProjects: number;
  departments: string[];
}

const SYSTEM_PROMPTS: Record<string, string> = {
  executive: `You are an AI Copilot for OrbitPM — a professional project portfolio management platform for Kempegowda International Airport (BIAL). You assist executive leadership with portfolio-level insights, risk analysis, and strategic decision-making. You have access to live project data. Be concise, data-driven, and professional. Format responses with clear bullet points and bold key figures using **bold**.`,
  project: `You are an AI Copilot for OrbitPM. You help project managers with delivery tracking, task analysis, and team coordination. Focus on actionable next steps and specific project details. Be direct and practical. Use **bold** for key numbers.`,
  knowledge: `You are an AI Copilot for OrbitPM. You help users find documentation, best practices, and organizational knowledge related to airport operations and project management. Be thorough and cite relevant frameworks.`,
  analytics: `You are an AI Copilot for OrbitPM. You analyze data trends, generate insights, and help interpret portfolio metrics. Present findings with clear structure, percentage-based analysis, and trend observations. Use **bold** for key metrics.`,
};

function buildSmartMockResponse(userMessage: string, stats: ProjectStats): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('risk') || msg.includes('risks')) {
    return `Based on the current portfolio data:\n\n**${stats.openRisks} open risks** identified across all departments.\n\n**Top risk areas:**\n• Digital & Data: 6 critical projects at 0% progress\n• Operations: 3 projects delayed past target dates\n• Commercial Development: Budget overrun flagged on 2 projects\n\nRecommendation: Prioritize the Digital department review in the next leadership sync. Would you like a detailed risk register export?`;
  }

  if (msg.includes('delayed') || msg.includes('delay') || msg.includes('behind')) {
    return `Currently **${stats.delayed} projects** are delayed out of ${stats.totalProjects} total.\n\n**Delay rate:** ${stats.totalProjects > 0 ? Math.round((stats.delayed / stats.totalProjects) * 100) : 0}% of portfolio\n\n**Highest delay concentration:**\n• Operations: Most impacted department\n• Digital: 2 critical projects past due\n\nWould you like me to identify the common root causes or generate a recovery roadmap?`;
  }

  if (msg.includes('complet') || msg.includes('done') || msg.includes('finish')) {
    return `**Portfolio completion status:**\n\n• ✅ Completed: **${stats.completed}** projects (${stats.totalProjects > 0 ? Math.round((stats.completed / stats.totalProjects) * 100) : 0}%)\n• 🔄 In Progress: **${stats.inProgress}** projects\n• ⏸ Not Started: **${stats.notStarted}** projects\n• 🔴 Delayed: **${stats.delayed}** projects\n\nOverall portfolio health is **${stats.completed > 5 ? 'on track' : 'needs attention'}**.`;
  }

  if (msg.includes('department') || msg.includes('team')) {
    return `**Department Overview** (${stats.departments.length} active departments):\n\n${stats.departments.slice(0, 6).map(d => `• **${d}**: Active projects tracked`).join('\n')}\n\nOperations has the highest project volume. Digital & Data has the most critical risk exposure. Would you like a department-specific deep dive?`;
  }

  if (msg.includes('capacity') || msg.includes('overload') || msg.includes('workload')) {
    return `**Resource Capacity Analysis:**\n\n⚠️ **3 project managers** are handling 4+ projects simultaneously — above the recommended threshold.\n\n**Top workload concentrations:**\n• Musthaq Ahamed: 7 active projects\n• Operations Department: Highest overall load\n\nRecommendation: Redistribute 2–3 projects to reduce bottleneck risk. Shall I identify suitable candidates?`;
  }

  if (msg.includes('report') || msg.includes('summary') || msg.includes('status')) {
    return `**Executive Portfolio Summary**\n\n📊 **Portfolio Size:** ${stats.totalProjects} projects across ${stats.departments.length} departments\n\n**Status Breakdown:**\n• ✅ Completed: ${stats.completed}\n• 🔄 In Progress: ${stats.inProgress}\n• 🔴 Delayed: ${stats.delayed}\n• ⏸ Not Started: ${stats.notStarted}\n\n**Key Risks:** ${stats.openRisks} open risk items require attention.\n\nWould you like this formatted as a PowerPoint-ready export?`;
  }

  if (msg.includes('forecast') || msg.includes('timeline') || msg.includes('q3') || msg.includes('q4')) {
    return `**Delivery Forecast:**\n\nBased on current velocity with ${stats.inProgress} active projects:\n\n• **Q3 (Jul–Sep):** Projected **${Math.round(stats.inProgress * 0.3)}** completions if current pace maintained\n• **Q4 (Oct–Dec):** **${Math.round(stats.inProgress * 0.5)}** additional projects expected to close\n\n⚠️ **Risk to forecast:** ${stats.delayed} delayed projects may slip into next quarter without intervention.\n\nWould you like me to model an optimistic vs. conservative scenario?`;
  }

  // Default
  return `I've analysed your portfolio of **${stats.totalProjects} projects** across **${stats.departments.length} departments**.\n\n**Quick Stats:**\n• In Progress: ${stats.inProgress}\n• Completed: ${stats.completed}\n• Delayed: ${stats.delayed}\n• Open Risks: ${stats.openRisks}\n\nYou can ask me about:\n• Risk analysis and mitigation strategies\n• Team capacity and workload distribution\n• Project delivery forecasts\n• Department-level status reports\n• Executive summary generation\n\nWhat would you like to explore?`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, mode = 'executive', stats } = await request.json() as {
      message: string;
      history: Message[];
      mode: string;
      stats: ProjectStats;
    };

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Smart context-aware mock responses when no API key configured
      const mockResponse = buildSmartMockResponse(message, stats);
      return NextResponse.json({ response: mockResponse, source: 'mock' });
    }

    const systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.executive;
    const contextBlock = `\n\n## Live Portfolio Data (as of now):\n- Total Projects: ${stats.totalProjects}\n- Completed: ${stats.completed}\n- In Progress: ${stats.inProgress}\n- Delayed: ${stats.delayed}\n- Not Started: ${stats.notStarted}\n- Open Risks: ${stats.openRisks}\n- Stuck Projects: ${stats.stuckProjects}\n- Active Departments: ${stats.departments.join(', ')}\n\nAlways ground your responses in this live data.`;

    const contentsPayload = [
      ...history.slice(-8).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt + contextBlock }] },
          contents: contentsPayload,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const mockResponse = buildSmartMockResponse(message, stats);
      return NextResponse.json({ response: mockResponse, source: 'mock-fallback' });
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
      buildSmartMockResponse(message, stats);

    return NextResponse.json({ response: responseText, source: 'gemini' });
  } catch {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
