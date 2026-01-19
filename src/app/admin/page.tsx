'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { AdminGuard } from '@/components/admin/AdminGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Users, Database, Cog, Plus, Edit2, Trash2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mockUsers, mockSources, statusLabels } from '@/lib/mock-data'
import type { User, Source } from '@/types/database'

export default function AdminPage() {
  return (
    <AdminGuard>
      <AppLayout title="管理画面" description="システム設定とデータ管理">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="bg-white border border-slate-200 shadow-sm mb-6">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              ダッシュボード設定
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              ユーザー管理
            </TabsTrigger>
            <TabsTrigger 
              value="master" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Database className="w-4 h-4 mr-2" />
              マスタデータ管理
            </TabsTrigger>
            <TabsTrigger 
              value="system" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Cog className="w-4 h-4 mr-2" />
              システム設定
            </TabsTrigger>
          </TabsList>

          {/* ダッシュボード設定タブ */}
          <TabsContent value="dashboard" className="mt-4">
            <DashboardSettingsTab />
          </TabsContent>

          {/* ユーザー管理タブ */}
          <TabsContent value="users" className="mt-4">
            <UserManagementTab />
          </TabsContent>

          {/* マスタデータ管理タブ */}
          <TabsContent value="master" className="mt-4">
            <MasterDataTab />
          </TabsContent>

          {/* システム設定タブ */}
          <TabsContent value="system" className="mt-4">
            <SystemSettingsTab />
          </TabsContent>
        </Tabs>
      </AppLayout>
    </AdminGuard>
  )
}

// ダッシュボード設定タブ
function DashboardSettingsTab() {
  const [budget, setBudget] = useState(29000000)
  const [kpiSettings, setKpiSettings] = useState({
    registrationToFirstContactRate: 0.65,
    firstContactToInterviewRate: 0.80,
    interviewToClosedRate: 0.60,
    revenuePerClosed: 600000,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    
    // バリデーション
    if (budget <= 0) {
      setSaveMessage({ type: 'error', text: '予算は0より大きい値を入力してください' })
      setIsSaving(false)
      return
    }
    
    if (kpiSettings.registrationToFirstContactRate < 0 || kpiSettings.registrationToFirstContactRate > 1) {
      setSaveMessage({ type: 'error', text: '登録→初回率は0〜1の間で入力してください' })
      setIsSaving(false)
      return
    }
    
    if (kpiSettings.firstContactToInterviewRate < 0 || kpiSettings.firstContactToInterviewRate > 1) {
      setSaveMessage({ type: 'error', text: '初回→面接率は0〜1の間で入力してください' })
      setIsSaving(false)
      return
    }
    
    if (kpiSettings.interviewToClosedRate < 0 || kpiSettings.interviewToClosedRate > 1) {
      setSaveMessage({ type: 'error', text: '面接→成約率は0〜1の間で入力してください' })
      setIsSaving(false)
      return
    }
    
    if (kpiSettings.revenuePerClosed <= 0) {
      setSaveMessage({ type: 'error', text: '成約単価は0より大きい値を入力してください' })
      setIsSaving(false)
      return
    }

    // TODO: 実際のAPI呼び出しに置き換え
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // ローカルストレージに保存（暫定）
    localStorage.setItem('admin_budget', budget.toString())
    localStorage.setItem('admin_kpi', JSON.stringify(kpiSettings))
    
    setSaveMessage({ type: 'success', text: '設定を保存しました' })
    setIsSaving(false)
    
    setTimeout(() => setSaveMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">予算設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="budget" className="text-sm font-medium text-slate-700">
              全体予算（円）
            </label>
            <input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              min="0"
            />
            <p className="text-xs text-slate-500">
              現在の設定: ¥{(budget / 10000).toLocaleString()}万
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">KPI目標値設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="registrationToFirstContactRate" className="text-sm font-medium text-slate-700">
                登録→初回率
              </label>
              <input
                id="registrationToFirstContactRate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={kpiSettings.registrationToFirstContactRate}
                onChange={(e) => setKpiSettings(prev => ({ ...prev, registrationToFirstContactRate: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-500">
                目標: {(kpiSettings.registrationToFirstContactRate * 100).toFixed(1)}%
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="firstContactToInterviewRate" className="text-sm font-medium text-slate-700">
                初回→面接率
              </label>
              <input
                id="firstContactToInterviewRate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={kpiSettings.firstContactToInterviewRate}
                onChange={(e) => setKpiSettings(prev => ({ ...prev, firstContactToInterviewRate: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-500">
                目標: {(kpiSettings.firstContactToInterviewRate * 100).toFixed(1)}%
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="interviewToClosedRate" className="text-sm font-medium text-slate-700">
                面接→成約率
              </label>
              <input
                id="interviewToClosedRate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={kpiSettings.interviewToClosedRate}
                onChange={(e) => setKpiSettings(prev => ({ ...prev, interviewToClosedRate: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-500">
                目標: {(kpiSettings.interviewToClosedRate * 100).toFixed(1)}%
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="revenuePerClosed" className="text-sm font-medium text-slate-700">
                成約単価（円）
              </label>
              <input
                id="revenuePerClosed"
                type="number"
                min="0"
                value={kpiSettings.revenuePerClosed}
                onChange={(e) => setKpiSettings(prev => ({ ...prev, revenuePerClosed: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-500">
                現在の設定: ¥{(kpiSettings.revenuePerClosed / 10000).toFixed(0)}万/人
              </p>
            </div>
          </div>

          {saveMessage && (
            <div className={`p-3 rounded-lg ${
              saveMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {saveMessage.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-md shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ユーザー管理タブ
function UserManagementTab() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    password: '',
  })
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleAddUser = () => {
    setFormData({ name: '', email: '', role: 'user', password: '' })
    setSelectedUser(null)
    setIsAddDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handlePasswordReset = (user: User) => {
    setSelectedUser(user)
    setIsPasswordResetDialogOpen(true)
  }

  const handleSaveUser = async () => {
    // バリデーション
    if (!formData.name.trim()) {
      setSaveMessage({ type: 'error', text: '氏名を入力してください' })
      return
    }
    if (!formData.email.trim()) {
      setSaveMessage({ type: 'error', text: 'メールアドレスを入力してください' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setSaveMessage({ type: 'error', text: '有効なメールアドレスを入力してください' })
      return
    }
    if (isAddDialogOpen && !formData.password.trim()) {
      setSaveMessage({ type: 'error', text: 'パスワードを入力してください' })
      return
    }

    // TODO: 実際のAPI呼び出しに置き換え
    await new Promise(resolve => setTimeout(resolve, 500))

    if (isAddDialogOpen) {
      // 新規追加
      const newUser: User = {
        id: String(users.length + 1),
        name: formData.name,
        email: formData.email,
        role: formData.role,
        created_at: new Date().toISOString().split('T')[0],
      }
      setUsers([...users, newUser])
      setSaveMessage({ type: 'success', text: 'ユーザーを追加しました' })
    } else {
      // 編集
      setUsers(users.map(u => 
        u.id === selectedUser?.id 
          ? { ...u, name: formData.name, email: formData.email, role: formData.role }
          : u
      ))
      setSaveMessage({ type: 'success', text: 'ユーザー情報を更新しました' })
    }

    setIsAddDialogOpen(false)
    setIsEditDialogOpen(false)
    setFormData({ name: '', email: '', role: 'user', password: '' })
    setSelectedUser(null)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser) return

    // TODO: 実際のAPI呼び出しに置き換え
    await new Promise(resolve => setTimeout(resolve, 500))

    setUsers(users.filter(u => u.id !== selectedUser.id))
    setIsDeleteDialogOpen(false)
    setSelectedUser(null)
    setSaveMessage({ type: 'success', text: 'ユーザーを削除しました' })
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handlePasswordResetConfirm = async () => {
    if (!selectedUser) return

    // TODO: 実際のAPI呼び出しに置き換え
    await new Promise(resolve => setTimeout(resolve, 500))

    setIsPasswordResetDialogOpen(false)
    setSelectedUser(null)
    setSaveMessage({ type: 'success', text: 'パスワードリセットメールを送信しました' })
    setTimeout(() => setSaveMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div className={`p-3 rounded-lg ${
          saveMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-slate-800">ユーザー一覧</CardTitle>
            <Button
              onClick={handleAddUser}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              ユーザー追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-slate-600 font-semibold">氏名</TableHead>
                  <TableHead className="text-slate-600 font-semibold">メールアドレス</TableHead>
                  <TableHead className="text-slate-600 font-semibold">ロール</TableHead>
                  <TableHead className="text-slate-600 font-semibold">作成日</TableHead>
                  <TableHead className="text-slate-600 font-semibold w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-slate-100 hover:bg-violet-50/30">
                    <TableCell className="font-medium text-slate-800">{user.name}</TableCell>
                    <TableCell className="text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={user.role === 'admin' 
                          ? 'bg-violet-100 text-violet-700 border-violet-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                        }
                      >
                        {user.role === 'admin' ? '管理者' : '一般ユーザー'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{user.created_at}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-violet-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePasswordReset(user)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-violet-600"
                          title="パスワードリセット"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ユーザー追加ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>ユーザー追加</DialogTitle>
            <DialogDescription>
              新しいユーザーを追加します
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">氏名</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="氏名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">メールアドレス</Label>
              <Input
                id="add-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">ロール</Label>
              <Select value={formData.role} onValueChange={(value: 'admin' | 'user') => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">一般ユーザー</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">パスワード</Label>
              <Input
                id="add-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="パスワードを入力"
              />
            </div>
          </div>
          {saveMessage && saveMessage.type === 'error' && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {saveMessage.text}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSaveUser}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
            >
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ユーザー編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>ユーザー編集</DialogTitle>
            <DialogDescription>
              ユーザー情報を編集します
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">氏名</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="氏名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">メールアドレス</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">ロール</Label>
              <Select value={formData.role} onValueChange={(value: 'admin' | 'user') => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">一般ユーザー</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {saveMessage && saveMessage.type === 'error' && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {saveMessage.text}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSaveUser}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>ユーザー削除</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* パスワードリセットダイアログ */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>パスワードリセット</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}（{selectedUser?.email}）にパスワードリセットメールを送信しますか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordResetDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handlePasswordResetConfirm}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
            >
              送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// マスタデータ管理タブ
function MasterDataTab() {
  const [sources, setSources] = useState<Source[]>(mockSources)
  const [statusLabelSettings, setStatusLabelSettings] = useState<Record<string, string>>(statusLabels)
  const [isSourceAddDialogOpen, setIsSourceAddDialogOpen] = useState(false)
  const [isSourceEditDialogOpen, setIsSourceEditDialogOpen] = useState(false)
  const [isSourceDeleteDialogOpen, setIsSourceDeleteDialogOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [sourceFormData, setSourceFormData] = useState({
    name: '',
    category: '',
  })
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleAddSource = () => {
    setSourceFormData({ name: '', category: '' })
    setSelectedSource(null)
    setIsSourceAddDialogOpen(true)
  }

  const handleEditSource = (source: Source) => {
    setSelectedSource(source)
    setSourceFormData({
      name: source.name,
      category: source.category || '',
    })
    setIsSourceEditDialogOpen(true)
  }

  const handleDeleteSource = (source: Source) => {
    setSelectedSource(source)
    setIsSourceDeleteDialogOpen(true)
  }

  const handleSaveSource = async () => {
    if (!sourceFormData.name.trim()) {
      setSaveMessage({ type: 'error', text: '媒体名を入力してください' })
      return
    }

    // TODO: 実際のAPI呼び出しに置き換え
    await new Promise(resolve => setTimeout(resolve, 500))

    if (isSourceAddDialogOpen) {
      const newSource: Source = {
        id: String(sources.length + 1),
        name: sourceFormData.name,
        category: sourceFormData.category || null,
      }
      setSources([...sources, newSource])
      setSaveMessage({ type: 'success', text: '媒体を追加しました' })
    } else {
      setSources(sources.map(s => 
        s.id === selectedSource?.id 
          ? { ...s, name: sourceFormData.name, category: sourceFormData.category || null }
          : s
      ))
      setSaveMessage({ type: 'success', text: '媒体情報を更新しました' })
    }

    setIsSourceAddDialogOpen(false)
    setIsSourceEditDialogOpen(false)
    setSourceFormData({ name: '', category: '' })
    setSelectedSource(null)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleConfirmDeleteSource = async () => {
    if (!selectedSource) return

    // TODO: 実際のAPI呼び出しに置き換え
    await new Promise(resolve => setTimeout(resolve, 500))

    setSources(sources.filter(s => s.id !== selectedSource.id))
    setIsSourceDeleteDialogOpen(false)
    setSelectedSource(null)
    setSaveMessage({ type: 'success', text: '媒体を削除しました' })
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleSaveStatusLabels = async () => {
    // TODO: 実際のAPI呼び出しに置き換え
    await new Promise(resolve => setTimeout(resolve, 500))

    localStorage.setItem('admin_status_labels', JSON.stringify(statusLabelSettings))
    setSaveMessage({ type: 'success', text: 'ステータスラベルを保存しました' })
    setTimeout(() => setSaveMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div className={`p-3 rounded-lg ${
          saveMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* 媒体マスタ管理 */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-slate-800">媒体マスタ</CardTitle>
            <Button
              onClick={handleAddSource}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              媒体追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-slate-600 font-semibold">媒体名</TableHead>
                  <TableHead className="text-slate-600 font-semibold">カテゴリ</TableHead>
                  <TableHead className="text-slate-600 font-semibold w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id} className="border-slate-100 hover:bg-violet-50/30">
                    <TableCell className="font-medium text-slate-800">{source.name}</TableCell>
                    <TableCell className="text-slate-600">{source.category || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSource(source)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-violet-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSource(source)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ステータスラベル管理 */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">ステータスラベル設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(statusLabelSettings).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`status-${key}`}>{key}</Label>
                <Input
                  id={`status-${key}`}
                  value={label}
                  onChange={(e) => setStatusLabelSettings(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveStatusLabels}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
            >
              保存
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 媒体追加ダイアログ */}
      <Dialog open={isSourceAddDialogOpen} onOpenChange={setIsSourceAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>媒体追加</DialogTitle>
            <DialogDescription>
              新しい媒体を追加します
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source-name">媒体名</Label>
              <Input
                id="source-name"
                value={sourceFormData.name}
                onChange={(e) => setSourceFormData({ ...sourceFormData, name: e.target.value })}
                placeholder="媒体名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-category">カテゴリ</Label>
              <Input
                id="source-category"
                value={sourceFormData.category}
                onChange={(e) => setSourceFormData({ ...sourceFormData, category: e.target.value })}
                placeholder="カテゴリを入力（任意）"
              />
            </div>
          </div>
          {saveMessage && saveMessage.type === 'error' && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {saveMessage.text}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSourceAddDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSaveSource}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
            >
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 媒体編集ダイアログ */}
      <Dialog open={isSourceEditDialogOpen} onOpenChange={setIsSourceEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>媒体編集</DialogTitle>
            <DialogDescription>
              媒体情報を編集します
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-source-name">媒体名</Label>
              <Input
                id="edit-source-name"
                value={sourceFormData.name}
                onChange={(e) => setSourceFormData({ ...sourceFormData, name: e.target.value })}
                placeholder="媒体名を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-source-category">カテゴリ</Label>
              <Input
                id="edit-source-category"
                value={sourceFormData.category}
                onChange={(e) => setSourceFormData({ ...sourceFormData, category: e.target.value })}
                placeholder="カテゴリを入力（任意）"
              />
            </div>
          </div>
          {saveMessage && saveMessage.type === 'error' && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {saveMessage.text}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSourceEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSaveSource}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 媒体削除確認ダイアログ */}
      <Dialog open={isSourceDeleteDialogOpen} onOpenChange={setIsSourceDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>媒体削除</DialogTitle>
            <DialogDescription>
              {selectedSource?.name}を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSourceDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleConfirmDeleteSource}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// システム設定タブ
function SystemSettingsTab() {
  const [systemSettings, setSystemSettings] = useState({
    enableNotifications: true,
    enableEmailAlerts: false,
    defaultPageSize: 50,
    sessionTimeout: 30,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    // TODO: 実際のAPI呼び出しに置き換え
    await new Promise(resolve => setTimeout(resolve, 500))

    localStorage.setItem('admin_system_settings', JSON.stringify(systemSettings))
    setSaveMessage({ type: 'success', text: 'システム設定を保存しました' })
    setIsSaving(false)
    setTimeout(() => setSaveMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div className={`p-3 rounded-lg ${
          saveMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="defaultPageSize">デフォルトページサイズ</Label>
            <Select 
              value={systemSettings.defaultPageSize.toString()} 
              onValueChange={(value) => setSystemSettings(prev => ({ ...prev, defaultPageSize: Number(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25件</SelectItem>
                <SelectItem value="50">50件</SelectItem>
                <SelectItem value="100">100件</SelectItem>
                <SelectItem value="200">200件</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">一覧表示のデフォルト件数</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionTimeout">セッションタイムアウト（分）</Label>
            <Input
              id="sessionTimeout"
              type="number"
              min="5"
              max="480"
              value={systemSettings.sessionTimeout}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-slate-500">5〜480分の間で設定してください</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">通知設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableNotifications">通知を有効にする</Label>
              <p className="text-xs text-slate-500">システム内の通知を表示します</p>
            </div>
            <input
              id="enableNotifications"
              type="checkbox"
              checked={systemSettings.enableNotifications}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, enableNotifications: e.target.checked }))}
              className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableEmailAlerts">メールアラートを有効にする</Label>
              <p className="text-xs text-slate-500">重要なイベントをメールで通知します</p>
            </div>
            <input
              id="enableEmailAlerts"
              type="checkbox"
              checked={systemSettings.enableEmailAlerts}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, enableEmailAlerts: e.target.checked }))}
              className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}

