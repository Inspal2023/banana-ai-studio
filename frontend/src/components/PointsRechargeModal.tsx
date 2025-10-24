import { X, QrCode, MessageCircle, Users } from 'lucide-react'

interface PointsRechargeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PointsRechargeModal({ isOpen, onClose }: PointsRechargeModalProps) {
  if (!isOpen) return null

  // 积分兑换价格表
  const pricePlans = [
    { points: 100, price: 10, bonus: 0, popular: false },
    { points: 300, price: 30, bonus: 30, popular: false },
    { points: 500, price: 50, bonus: 75, popular: true },
    { points: 1000, price: 100, bonus: 200, popular: false },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-neutral-900">联系管理员充值</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 积分兑换价格表 */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">积分兑换价格表</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pricePlans.map((plan) => (
                <div
                  key={plan.points}
                  className={`relative border-2 rounded-lg p-4 transition-all ${
                    plan.popular
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-primary-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        推荐
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 mb-1">
                      {plan.points}
                      {plan.bonus > 0 && (
                        <span className="text-sm text-semantic-success">+{plan.bonus}</span>
                      )}
                    </div>
                    <div className="text-sm text-neutral-600 mb-3">积分</div>
                    <div className="text-xl font-bold text-neutral-900">¥{plan.price}</div>
                    {plan.bonus > 0 && (
                      <div className="text-xs text-semantic-success mt-1">
                        赠送 {plan.bonus} 积分
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 管理员微信二维码 */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">联系管理员微信</h3>
            <div className="bg-neutral-50 rounded-lg p-6 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-48 h-48 bg-white border-2 border-neutral-200 rounded-lg flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-neutral-400" />
                  {/* 这里应该显示管理员微信二维码 */}
                </div>
                <div className="text-sm text-neutral-600">
                  <p className="text-primary-600 font-medium">
                    扫码下方二维码添加管理员微信
                  </p>
                  <p className="text-semantic-success mt-1">
                    联系管理员进行充值，手动添加积分
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 线下充值流程说明 */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">线下充值流程</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-800 space-y-3">
                  <p><strong>请按照以下步骤操作：</strong></p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                      <span>查看上方积分价格表，选择合适的充值方案</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                      <span>扫描二维码添加管理员微信</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                      <span>通过微信联系管理员进行充值</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                      <span>管理员核实后手动添加积分到账户</span>
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 mt-3">
                    <p className="font-medium text-blue-900 mb-1">联系方式：</p>
                    <p>📱 微信：banana-ai-admin</p>
                    <p>📧 邮箱：admin@banana-ai.com</p>
                    <p>🕐 客服时间：工作日 9:00-18:00</p>
                  </div>
                  <p className="text-semantic-warning mt-2">
                    ⚠️ 充值后请保留微信聊天记录，以便核实充值信息
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 充值提示 */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">温馨提示</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="text-sm text-yellow-800 space-y-2">
                  <p><strong>充值前请注意：</strong></p>
                  <ul className="space-y-1 ml-4">
                    <li>• 积分充值后不可退款，请谨慎选择充值金额</li>
                    <li>• 大额充值可联系管理员获得更多优惠</li>
                    <li>• 充值后积分立即到账，无需等待</li>
                    <li>• 如有疑问，请随时联系管理员</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="border-t border-neutral-200 p-6 sticky bottom-0 bg-white">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
            >
              稍后充值
            </button>
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
            >
              开始充值
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}