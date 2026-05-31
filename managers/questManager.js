const { prisma } = require('../database/client');
const { QUESTS } = require('../config/gameData');

async function updateQuestProgress(playerId, questType, amount = 1) {
    // 1. Fetch active quests that are NOT claimed
    const activeQuests = await prisma.playerQuest.findMany({
        where: { 
            playerId, 
            claimed: false 
        }
    });

    for (const pq of activeQuests) {
        const questData = QUESTS[pq.questId];
        
        // 2. Ensure the quest exists and the action type matches
        if (questData && questData.action === questType) {
            // Only progress if not already completed
            if (pq.completed) continue;

            const newProgress = Math.min(pq.progress + amount, questData.goal);
            const isCompleted = newProgress >= questData.goal;

            await prisma.playerQuest.update({
                where: { id: pq.id },
                data: {
                    progress: newProgress,
                    completed: isCompleted
                }
            });
        }
    }
}

module.exports = { updateQuestProgress };
