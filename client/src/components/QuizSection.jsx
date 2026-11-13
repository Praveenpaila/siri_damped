import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, HelpCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QuizSection({ quizQuestions = [] }) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState({});

  const handleSelectOption = (qId, optionIdx) => {
    if (submitted[qId]) return; // lock once answered
    setSelectedAnswers(prev => ({ ...prev, [qId]: optionIdx }));
    setSubmitted(prev => ({ ...prev, [qId]: true }));

    // Check if all answered and trigger confetti if high score
    const q = quizQuestions.find(item => item.id === qId);
    if (q && q.correctIndex === optionIdx) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (e) {}
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted({});
  };

  const answeredCount = Object.keys(submitted).length;
  const correctCount = quizQuestions.filter(q => submitted[q.id] && selectedAnswers[q.id] === q.correctIndex).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">Physics Mastery Quiz</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Test your understanding of damping regimes, fluid viscosity, Stokes' drag, and engineering applications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs font-mono">
            Score: <span className="text-cyan-400 font-bold">{correctCount}</span> / {quizQuestions.length}
          </div>

          {answeredCount > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Questions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {quizQuestions.map((q, idx) => {
          const isAnswered = submitted[q.id];
          const userChoice = selectedAnswers[q.id];
          const isCorrect = userChoice === q.correctIndex;

          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col gap-3.5 shadow-lg ${
                isAnswered
                  ? isCorrect
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-red-950/20 border-red-500/40'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              {/* Question Number & Title */}
              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center text-xs font-mono font-bold">
                  {idx + 1}
                </span>
                <h4 className="text-sm font-semibold text-slate-100 leading-snug">
                  {q.question}
                </h4>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2">
                {q.options.map((opt, optIdx) => {
                  let optStyle = 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80';
                  if (isAnswered) {
                    if (optIdx === q.correctIndex) {
                      optStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-semibold';
                    } else if (optIdx === userChoice) {
                      optStyle = 'bg-red-950/70 border-red-500 text-red-200';
                    } else {
                      optStyle = 'opacity-40 border-slate-800 text-slate-500';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${optStyle}`}
                    >
                      <span>{opt}</span>
                      {isAnswered && optIdx === q.correctIndex && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" />
                      )}
                      {isAnswered && optIdx === userChoice && optIdx !== q.correctIndex && (
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation upon answer */}
              {isAnswered && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                  <span className="font-semibold text-cyan-400 block mb-0.5">Explanation:</span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

