package model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    @SerialName("id") val id: Int = 0,
    @SerialName("name") val name: String = "",
    @SerialName("email") val email: String? = null,
    @SerialName("api_key") val apiKey: String? = null,
    @SerialName("profile_img") val profileImage: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)