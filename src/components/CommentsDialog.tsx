import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

interface Game {
  id: string;
  title: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  profile_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommentsDialogProps {
  game: Game | null;
  currentUser: Profile | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCommentsUpdated?: () => void; // Callback to refresh other components if needed
}

export const CommentsDialog = ({ game, currentUser, isOpen, onOpenChange, onCommentsUpdated }: CommentsDialogProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  useEffect(() => {
    if (game && isOpen) {
      loadComments(game.id);
    }
    if (!isOpen) {
      // Reset state when closing
      setComments([]);
      setNewComment("");
      setEditingCommentId(null);
    }
  }, [game, isOpen]);

  const loadComments = async (gameId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar comentários", description: error.message, variant: "destructive" });
    } else {
      setComments(data as any);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting comment...");
    console.log("newComment:", newComment);
    console.log("game:", game);
    console.log("currentUser:", currentUser);
    if (!newComment.trim() || !game || !currentUser) return;

    const { error } = await supabase.from('comments').insert({
      game_id: game.id,
      profile_id: currentUser.id,
      comment: newComment,
    });

    if (error) {
      toast({ title: "Erro ao enviar comentário", description: error.message, variant: "destructive" });
    } else {
      setNewComment('');
      await loadComments(game.id);
      onCommentsUpdated?.();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      toast({ title: "Erro ao excluir comentário", description: error.message, variant: "destructive" });
    } else {
      await loadComments(game!.id);
      onCommentsUpdated?.();
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    const { error } = await supabase
      .from('comments')
      .update({ comment: editingCommentText })
      .eq('id', commentId);

    if (error) {
      toast({ title: "Erro ao atualizar comentário", description: error.message, variant: "destructive" });
    } else {
      setEditingCommentId(null);
      setEditingCommentText('');
      await loadComments(game!.id);
      onCommentsUpdated?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{game?.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6 -mr-6">
          <div className="space-y-4 mt-4">
            <h4 className="font-semibold text-lg">Comentários</h4>
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <Textarea
                placeholder="Deixe seu comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1"
                disabled={!currentUser}
              />
              <Button type="submit" disabled={!currentUser}>Enviar</Button>
            </form>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={comment.profiles.avatar_url || undefined} />
                    <AvatarFallback>{comment.profiles.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{comment.profiles.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="flex flex-col gap-2 mt-2">
                        <Textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>Salvar</Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                    )}
                  </div>
                  {currentUser && currentUser.id === comment.profile_id && !editingCommentId && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.comment); }}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteComment(comment.id)}>Excluir</Button>
                    </div>
                  )}
                </div>
              ))}
               {comments.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};