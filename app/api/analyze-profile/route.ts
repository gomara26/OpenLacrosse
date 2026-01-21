import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { profileData } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const prompt = `You are an expert college lacrosse recruiting analyst. Analyze the following player profile and provide a comprehensive recruiting analysis in JSON format.

Player Profile:
${JSON.stringify(profileData, null, 2)}

Please provide a detailed analysis with the following structure:
{
  "overallAssessment": "A comprehensive 2-3 sentence summary of the player's recruiting position, including their competitiveness for different division levels and geographic regions.",
  "academicAnalysis": "A detailed analysis of the player's academic credentials (GPA, test scores) and how they compare to typical requirements for different division levels. Include how their academic interests align with collegiate programs.",
  "athleticAnalysis": "A detailed analysis of the player's athletic profile including position, physical stats, achievements, and how these position them for different division levels.",
  "targetDivisions": ["Division I", "Division II", "Division III"],
  "strengths": [
    "Strength 1",
    "Strength 2",
    "Strength 3"
  ],
  "areasForImprovement": [
    "Area 1",
    "Area 2",
    "Area 3",
    "Area 4"
  ],
  "nextSteps": [
    "Step 1",
    "Step 2",
    "Step 3",
    "Step 4",
    "Step 5"
  ]
}

Be specific, realistic, and actionable. Focus on lacrosse recruiting context. Return ONLY valid JSON, no markdown formatting.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert college lacrosse recruiting analyst. Always respond with valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    const analysis = JSON.parse(analysisText)

    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error('Error generating analysis:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}
