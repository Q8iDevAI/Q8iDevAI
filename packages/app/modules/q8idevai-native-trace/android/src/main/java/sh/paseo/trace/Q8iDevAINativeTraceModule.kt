package sh.q8idevai.trace

import android.os.Trace
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class Q8iDevAINativeTraceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Q8iDevAINativeTrace")

    Function("beginSection") { name: String ->
      Trace.beginSection(name.take(127))
    }

    Function("endSection") {
      Trace.endSection()
    }
  }
}
