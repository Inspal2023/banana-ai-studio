import React from 'react'
import { X, Coins, Plus, Clock, TrendingUp } from 'lucide-react'
import PointsRechargeModal from './PointsRechargeModal'

interface Transaction {
  id: string
  type: 'earn' | 'spend' | 'recharge'
  amount: number
  description: string
  timestamp: Date
  status: 'completed' | 'pending' | 'failed'
}

interface PointsAccountModalProps {
  isOpen: boolean
  onClose: () => void
  currentPoints: number
  totalPoints: number
  transactions: Transaction[]
}

export default function PointsAccountModal({
  isOpen,
  onClose,
  currentPoints,
  totalPoints,
  transactions
}: PointsAccountModalProps) {
  const [showRechargeModal, setShowRechargeModal] = React.useState(false)

  if (!isOpen) return null

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'earn':
        return <TrendingUp className="w-4 h-4 text-semantic-success" />
      case 'spend':
        return <Coins className="w-4 h-4 text-semantic-error" />
      case 'recharge':
        return <Plus className="w-4 h-4 text-semantic-info" />
      default:
        return <Clock className="w-4 h-4 text-neutral-600" />
    }
  }

  const getTransactionText = (type: Transaction['type']) => {
    switch (type) {
      case 'earn':
        return '获得'
      case 'spend':
        return '消费'
      case 'recharge':
        return '充值'
      default:
        return '未知'
    }
  }

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'text-semantic-success'
      case 'pending':
        return 'text-semantic-warning'
      case 'failed':
        return 'text-semantic-error'
      default:
        return 'text-neutral-600'
    }
  }

  const getStatusText = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return '已完成'
      case 'pending':
        return '处理中'
      case 'failed':
        return '失败'
      default:
        return '未知'
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900">积分账户</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-neutral-600" />
            </button>
          </div>

          {/* 积分概览 */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-primary-500" />
                  <span className="text-sm font-medium text-primary-700">当前可用</span>
                </div>
                <div className="text-2xl font-bold text-primary-900">{currentPoints}</div>
              </div>
              
              <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-neutral-600" />
                  <span className="text-sm font-medium text-neutral-700">总积分</span>
                </div>
                <div className="text-2xl font-bold text-neutral-900">{totalPoints}</div>
              </div>
            </div>

            {/* 充值按钮 */}
            <button
              onClick={() => setShowRechargeModal(true)}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              立即充值
            </button>
          </div>

          {/* 最近交易记录 */}
          <div className="border-t border-neutral-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">最近交易记录</h3>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <div className="font-medium text-neutral-900">
                            {getTransactionText(transaction.type)} {transaction.amount} 积分
                          </div>
                          <div className="text-sm text-neutral-600">{transaction.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-neutral-900">
                          {transaction.timestamp.toLocaleDateString()}
                        </div>
                        <div className={`text-xs ${getStatusColor(transaction.status)}`}>
                          {getStatusText(transaction.status)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-neutral-500 py-8">
                    暂无交易记录
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 充值弹窗 */}
      <PointsRechargeModal
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
      />
    </>
  )
}