const ALL_STAGES = [0.15, 0.5, 2, 8, 15]

// نشون‌دادن ۵ مرحله‌ی طول کلیپ؛ مرحله‌های بازشده قابل کلیک و پخشن
function StageIndicator({ clips, activeStage, onPlay }) {
  const unlockedStages = new Set(clips.map((c) => c.stage))

  return (
    <div className="stages">
      {ALL_STAGES.map((stage) => {
        const unlocked = unlockedStages.has(stage)
        const clip = clips.find((c) => c.stage === stage)
        return (
          <button
            key={stage}
            type="button"
            className={`stage ${unlocked ? 'unlocked' : 'locked'} ${activeStage === stage ? 'active' : ''}`}
            disabled={!unlocked}
            onClick={() => clip && onPlay(clip)}
          >
            {stage}s
          </button>
        )
      })}
    </div>
  )
}

export default StageIndicator
