"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Loader2, Save, ChevronLeft, Sparkles } from 'lucide-react';

// New Components
import TestBuilderLayout from '@/components/test/TestBuilderLayout';
import QuestionListSidebar from '@/components/test/QuestionListSidebar';
import MCQEditor from '@/components/test/MCQEditor';
import CodingEditor from '@/components/test/CodingEditor';
import AIGeneratorModal from '@/components/test/AIGeneratorModal';

export default function CreateTestPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [recruiterId, setRecruiterId] = useState<number | null>(null);

    // Test State
    const [testDetails, setTestDetails] = useState({
        title: "Untitled Assessment",
        description: "",
        duration_minutes: 60,
    });

    const [questions, setQuestions] = useState<any[]>([]);
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

    // AI Modal State
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiModalType, setAiModalType] = useState<'mcq' | 'coding'>('coding');

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && user.id) setRecruiterId(user.id);
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
    }, []);

    // --- Question Management ---

    const handleAddQuestion = (type: 'mcq' | 'coding') => {
        const newQuestion = type === 'mcq' ? {
            title: "New MCQ Question",
            description: "",
            q_type: "mcq",
            options: ["", "", "", ""],
            correct_option: 0,
            difficulty: "Medium"
        } : {
            title: "New Coding Challenge",
            description: "",
            q_type: "coding",
            language: "python",
            difficulty: "Medium",
            constraints: "",
            examples: [],
            hidden_tests: [],
            canonical_solution: ""
        };

        const newQuestions = [...questions, newQuestion];
        setQuestions(newQuestions);
        setSelectedQuestionIndex(newQuestions.length - 1); // Select the new question
    };

    const handleRemoveQuestion = (index: number) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        if (selectedQuestionIndex === index) {
            setSelectedQuestionIndex(null);
        } else if (selectedQuestionIndex !== null && selectedQuestionIndex > index) {
            setSelectedQuestionIndex(selectedQuestionIndex - 1);
        }
    };

    const handleUpdateQuestion = (updatedQuestion: any) => {
        if (selectedQuestionIndex === null) return;
        const newQuestions = [...questions];
        newQuestions[selectedQuestionIndex] = updatedQuestion;
        setQuestions(newQuestions);
    };

    const handleAIGenerate = (generatedData: any | any[]) => {
        const newItems = Array.isArray(generatedData) ? generatedData : [generatedData];
        const newQuestions = [...questions, ...newItems];
        setQuestions(newQuestions);
        // Select the first of the newly added questions
        setSelectedQuestionIndex(questions.length);
        toast.success(`${newItems.length} Question(s) added!`);
    };

    const openAIModal = (type: 'mcq' | 'coding') => {
        setAiModalType(type);
        setAiModalOpen(true);
    };

    // --- Saving ---

    const handleSaveTest = async () => {
        if (!testDetails.title) return toast.error("Please enter a test title");
        if (questions.length === 0) return toast.error("Please add at least one question");
        if (!recruiterId) return toast.error("Recruiter ID not found. Please login again.");

        // Validation
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.title || !q.description) {
                return toast.error(`Question ${i + 1} is missing title or description`);
            }
            if (q.q_type === 'mcq' && q.options.some((o: string) => !o)) {
                return toast.error(`Question ${i + 1} (MCQ) has empty options`);
            }
        }

        setLoading(true);
        try {
            const testData = {
                ...testDetails,
                recruiter_id: recruiterId,
                meta: { created_via: "web_ui_v2" }
            };

            const createdTest = await apiClient.createTest(testData);

            for (const q of questions) {
                await apiClient.addQuestion(createdTest.id, q);
            }

            toast.success("Test created successfully!");
            router.push("/recruiter");
        } catch (error) {
            toast.error("Failed to save test");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Render ---

    const sidebar = (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <h1 className="font-bold text-lg">Test Builder</h1>
            </div>

            <QuestionListSidebar
                testDetails={testDetails}
                onUpdateTestDetails={setTestDetails}
                questions={questions}
                selectedQuestionIndex={selectedQuestionIndex}
                onSelectQuestion={setSelectedQuestionIndex}
                onAddQuestion={handleAddQuestion}
                onRemoveQuestion={handleRemoveQuestion}
            />

            <div className="pt-4">
                <Button
                    variant="secondary"
                    className="w-full mb-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border-purple-500/20"
                    onClick={() => openAIModal('coding')}
                >
                    <Sparkles className="w-4 h-4 mr-2 text-purple-500" /> AI Generate
                </Button>

                <Button className="w-full" onClick={handleSaveTest} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Publish Test
                </Button>
            </div>
        </div>
    );

    const editor = selectedQuestionIndex !== null && questions[selectedQuestionIndex] ? (
        questions[selectedQuestionIndex].q_type === 'mcq' ? (
            <MCQEditor
                question={questions[selectedQuestionIndex]}
                onChange={handleUpdateQuestion}
            />
        ) : (
            <CodingEditor
                question={questions[selectedQuestionIndex]}
                onChange={handleUpdateQuestion}
            />
        )
    ) : (
        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground space-y-4">
            <div className="p-4 rounded-full bg-muted/30">
                <Sparkles className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">Select or Add a Question</h3>
                <p className="text-sm max-w-sm mt-2">
                    Get started by adding a new question from the sidebar, or use our AI generator to create one instantly.
                </p>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleAddQuestion('mcq')}>Add MCQ</Button>
                <Button variant="outline" onClick={() => handleAddQuestion('coding')}>Add Coding</Button>
            </div>
        </div>
    );

    return (
        <>
            <TestBuilderLayout sidebar={sidebar} editor={editor} />
            <AIGeneratorModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                onGenerate={handleAIGenerate}
                type={aiModalType}
            />
        </>
    );
}
