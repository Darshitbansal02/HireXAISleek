import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Download, Trash2, PenTool, X } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface WhiteboardProps {
    roomId: string;
    socket: Socket | null;
    onClose: () => void;
    isReadOnly?: boolean;
}

interface Point {
    x: number;
    y: number;
}

interface DrawEvent {
    prev: Point;
    curr: Point;
    color: string;
    width: number;
}

export function Whiteboard({ roomId, socket, onClose, isReadOnly = false }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(2);
    const prevPoint = useRef<Point | null>(null);

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const handleResize = () => {
            if (parent && canvas && ctx) {
                // Save current content
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0);

                // Resize
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;

                // Restore content
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(tempCanvas, 0, 0);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        const handleRemoteDraw = (data: any) => {
            const { prev, curr, color, width } = data;
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.stroke();
            ctx.closePath();
        };

        const handleRemoteClear = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        };

        socket.on('wb_draw', handleRemoteDraw);
        socket.on('wb_clear', handleRemoteClear);

        return () => {
            socket.off('wb_draw', handleRemoteDraw);
            socket.off('wb_clear', handleRemoteClear);
        };
    }, [socket]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (isReadOnly) return;
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        prevPoint.current = { x, y };
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !prevPoint.current || isReadOnly) return;

        const { x, y } = getCoordinates(e);
        const currPoint = { x, y };

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Draw locally
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(prevPoint.current.x, prevPoint.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.closePath();

        // Emit to socket
        socket?.emit('wb_draw', {
            room_id: roomId,
            prev: prevPoint.current,
            curr: currPoint,
            color,
            width: lineWidth
        });

        prevPoint.current = currPoint;
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        prevPoint.current = null;
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const clearBoard = () => {
        if (isReadOnly) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            socket?.emit('wb_clear', { room_id: roomId });
        }
    };

    const downloadBoard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `whiteboard-${new Date().toISOString()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    return (
        <div className="absolute inset-0 z-50 bg-white flex flex-col">
            {/* Toolbar */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-gray-50">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-700 mr-4">Whiteboard</h3>

                    {!isReadOnly && (
                        <>
                            <div className="flex items-center gap-1 border-r pr-4 mr-2">
                                <button
                                    onClick={() => { setColor('#000000'); setLineWidth(2); }}
                                    className={`p-2 rounded hover:bg-gray-200 ${color === '#000000' ? 'bg-gray-200' : ''}`}
                                    title="Black Pen"
                                >
                                    <div className="w-4 h-4 rounded-full bg-black" />
                                </button>
                                <button
                                    onClick={() => { setColor('#ef4444'); setLineWidth(2); }}
                                    className={`p-2 rounded hover:bg-gray-200 ${color === '#ef4444' ? 'bg-gray-200' : ''}`}
                                    title="Red Pen"
                                >
                                    <div className="w-4 h-4 rounded-full bg-red-500" />
                                </button>
                                <button
                                    onClick={() => { setColor('#3b82f6'); setLineWidth(2); }}
                                    className={`p-2 rounded hover:bg-gray-200 ${color === '#3b82f6' ? 'bg-gray-200' : ''}`}
                                    title="Blue Pen"
                                >
                                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                                </button>
                            </div>

                            <Button variant="ghost" size="sm" onClick={clearBoard} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4 mr-2" /> Clear
                            </Button>
                        </>
                    )}

                    <Button variant="ghost" size="sm" onClick={downloadBoard}>
                        <Download className="w-4 h-4 mr-2" /> Save
                    </Button>
                </div>

                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative bg-gray-100 overflow-hidden cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 w-full h-full touch-none"
                />
            </div>
        </div>
    );
}
