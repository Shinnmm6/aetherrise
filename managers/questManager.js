const { prisma } = require('../database/client');
const { QUESTS } = require('../config/gameData');

async function updateQuestProgress(playerId, questType, amount = 1) {
    const activeQuests = await prisma.playerQuest.findMany({
        where: { playerId, completed: false }
    });

    for (const pq of activeQuests) {
        const questData = QUESTS[pq.questId];
        
        if (questData && questData.action === questType) {
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
