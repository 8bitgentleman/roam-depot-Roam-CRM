import { Toaster, Intent } from "@blueprintjs/core"

const AppToaster = Toaster.create()

export const showToast = (message, level) => {
    AppToaster.show({ message: message, intent: Intent[level] })
}
