import { useState } from 'react';
import { Plus, Search, Zap, Edit2, Trash2, Tag, Hash, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuickReplies, QuickReply } from '@/hooks/useQuickReplies';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CATEGORIES = [
  { value: 'greeting', label: 'Greetings' },
  { value: 'support', label: 'Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'closing', label: 'Closing' },
  { value: 'other', label: 'Other' },
];

export function CannedResponsesSettings() {
  const { quickReplies, loading, addQuickReply, deleteQuickReply } = useQuickReplies();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    shortcut: '',
    category: 'other',
  });

  const filteredReplies = quickReplies.filter((reply) => {
    const matchesSearch =
      reply.title.toLowerCase().includes(search.toLowerCase()) ||
      reply.content.toLowerCase().includes(search.toLowerCase()) ||
      reply.shortcut?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory =
      selectedCategory === 'all' || reply.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSave = async () => {
    await addQuickReply(
      formData.title,
      formData.content,
      formData.shortcut || undefined,
      formData.category
    );
    setDialogOpen(false);
    setFormData({ title: '', content: '', shortcut: '', category: 'other' });
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteQuickReply(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const getCategoryBadgeVariant = (category: string | null) => {
    switch (category) {
      case 'greeting':
        return 'default';
      case 'support':
        return 'secondary';
      case 'sales':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Canned Responses
              </CardTitle>
              <CardDescription>
                Pre-written responses for quick replies. Use shortcuts in the inbox (e.g., /hello)
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Response
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search responses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responses List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading responses...
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">
                {quickReplies.length === 0
                  ? 'No canned responses yet'
                  : 'No matching responses found'}
              </p>
              <p className="text-sm">
                {quickReplies.length === 0 &&
                  'Create your first response to speed up replies'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{reply.title}</h4>
                        {reply.shortcut && (
                          <Badge variant="outline" className="font-mono text-xs">
                            <Hash className="w-3 h-3 mr-1" />
                            {reply.shortcut}
                          </Badge>
                        )}
                        {reply.category && (
                          <Badge variant={getCategoryBadgeVariant(reply.category)}>
                            <Tag className="w-3 h-3 mr-1" />
                            {reply.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {reply.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Used {reply.usage_count} times
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingId(reply.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Canned Response</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Greeting"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Response Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Hello! Thank you for contacting us..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shortcut">Shortcut (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    /
                  </span>
                  <Input
                    id="shortcut"
                    value={formData.shortcut}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shortcut: e.target.value.replace(/[^a-zA-Z0-9]/g, ''),
                      })
                    }
                    placeholder="hello"
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title || !formData.content}
            >
              Save Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Response?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The response will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
