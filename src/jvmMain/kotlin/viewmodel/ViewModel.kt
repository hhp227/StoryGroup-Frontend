package viewmodel

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

open class ViewModel {
    val viewModelScope: CoroutineScope = CoroutineScope(Dispatchers.Main)
}