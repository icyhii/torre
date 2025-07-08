import fetch from 'node-fetch';

const proficiencyMap = {
    'master': 5,
    'expert': 4,
    'proficient': 3,
    'novice': 2,
    'no-experience-interested': 1
};

export const searchPeopleAndBuildTeam = async (params, sendEvent) => {
    const { skills, teamSize } = params;
    const searchLimit = 100;
    let candidatePool = [];

    // 1. Fetch and stream initial candidates
    sendEvent('status', `Searching for up to ${searchLimit} candidates...`);
    
    // FINAL FIX: The request is updated to match the exact endpoint, method, and payload
    // structure captured from the browser's network traffic.
    const skillPayloads = skills.map(skill => ({
        'skill/role': {
            'text': skill.toLowerCase(),
            'proficiency': 'proficient'
        }
    }));

    const additionalFilters = [
        { 'opento': { 'term': 'full-time-employment' } },
        { 'language': { 'term': 'English', 'fluency': 'fully-fluent' } }
    ];

    const payload = {
        'and': [...skillPayloads, ...additionalFilters]
    };

    const apiEndpoint = `https://search.torre.co/people/_search?size=${searchLimit}&aggregate=false`;
    
    console.log(`Fetching from URL: ${apiEndpoint}`);
    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    const torreResponse = await fetch(apiEndpoint, {
        method: 'POST', // Corrected to POST
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    
    console.log(`Torre API response status: ${torreResponse.status}`);
    if (!torreResponse.ok) {
        const errorBody = await torreResponse.text();
        console.error('Torre API Error Body:', errorBody);
        throw new Error(`Torre API request failed with status ${torreResponse.status}`);
    }

    // FIX: The new endpoint returns a standard JSON object, not a stream.
    // The response is now parsed accordingly.
    const responseData = await torreResponse.json();
    candidatePool = responseData.results || [];

    // Stream candidates to the frontend one by one
    candidatePool.forEach(person => {
        sendEvent('candidate', person);
    });

    if (candidatePool.length === 0) {
        sendEvent('status', 'No candidates were found with these skills. Please try a different search.');
        sendEvent('dreamTeam', []); // Send an empty team to signal completion.
        return; 
    }

    // 2. Enrich candidate data with full genome information
    sendEvent('status', `Found ${candidatePool.length} candidates. Fetching detailed profiles...`);
    
    const enrichedCandidates = await Promise.all(
        candidatePool.map(async (person) => {
            try {
                // FIX: Use the correct endpoint to get detailed genome data including strengths.
                const genomeRes = await fetch(`https://torre.ai/api/genome/bios/${person.username}`);
                if (!genomeRes.ok) return { ...person, strengths: [] };
                const genomeData = await genomeRes.json();
                return { ...person, ...genomeData.person, strengths: genomeData.strengths || [] };
            } catch (e) {
                return { ...person, strengths: [] };
            }
        })
    );

    // 3. Run the Greedy Algorithm
    sendEvent('status', `Analyzing profiles and selecting the optimal team of ${teamSize}...`);
    
    let dreamTeam = [];
    let availableCandidates = [...enrichedCandidates];
    let uncoveredSkills = new Set(skills.map(s => s.toLowerCase()));

    console.log('\n--- Starting Greedy Algorithm ---');
    console.log('Initial skills to cover:', [...uncoveredSkills]);

    for (let i = 0; i < teamSize && availableCandidates.length > 0; i++) {
        let bestCandidate = null;
        let maxScore = -1;

        console.log(`\n--- Round ${i + 1} ---`);

        // DEBUG: Log the strengths of the first candidate to inspect the data structure.
        if (i === 0 && availableCandidates.length > 0) {
            console.log(`\n--- Inspecting strengths for first candidate: ${availableCandidates[0].username} ---`);
            console.log(JSON.stringify(availableCandidates[0].strengths, null, 2));
            console.log('--- End of strengths inspection ---\n');
        }

        for (const candidate of availableCandidates) {
            let score = 0;
            if (candidate.strengths) {
                for (const skill of candidate.strengths) {
                    if (uncoveredSkills.has(skill.name.toLowerCase())) {
                        score += proficiencyMap[skill.proficiency] || 0;
                    }
                }
            }
            if (score > maxScore) {
                maxScore = score;
                bestCandidate = candidate;
            }
        }

        if (bestCandidate) {
            console.log(`Selected Candidate: ${bestCandidate.username} (Score: ${maxScore})`);
            dreamTeam.push(bestCandidate);
            availableCandidates = availableCandidates.filter(c => c.username !== bestCandidate.username);
            bestCandidate.strengths?.forEach(skill => {
                if (uncoveredSkills.has(skill.name.toLowerCase())) {
                    console.log(`- Covering skill: ${skill.name.toLowerCase()}`);
                    uncoveredSkills.delete(skill.name.toLowerCase());
                }
            });
            console.log('Remaining skills to cover:', [...uncoveredSkills]);
        } else {
            console.log('No more candidates found who can cover the remaining skills.');
            break;
        }
    }

    console.log('\n--- Greedy Algorithm Finished ---');
    // 4. Send the final result
    sendEvent('dreamTeam', dreamTeam);
};
