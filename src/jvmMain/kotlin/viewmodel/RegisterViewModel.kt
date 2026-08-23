package viewmodel

import data.UserRepository
import helper.PreferenceManager

class RegisterViewModel internal constructor(
    private val userRepository: UserRepository,
    preferenceManager: PreferenceManager
) : ViewModel() {
}